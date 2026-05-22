const router = require('express').Router();
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { callOpenRouter: sharedCall, parseAIJson, saveAIResult, DEFAULT_MODEL } = require('../lib/aiHelpers');

// aiRateLimiter: 20 AI requests per user per hour (audit pattern)
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id ? String(req.user.id) : ipKeyGenerator(req.ip),
  message: { error: 'Too many AI requests. Limit: 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// Backwards-compat alias used by older endpoints below
const aiRateLimit = aiRateLimiter;

// callOpenRouter signature kept (prompt, systemPrompt) for backward compatibility.
// Pulls active req from a per-request store via Express middleware below to enable auto-logging.
const asyncLocalStorage = new (require('async_hooks').AsyncLocalStorage)();
async function callOpenRouter(prompt, systemPrompt) {
  const text = await sharedCall(systemPrompt, prompt);
  const ctx = asyncLocalStorage.getStore();
  if (ctx?.req) {
    logAIResult(ctx.req, ctx.feature || 'unknown', { prompt: String(prompt).slice(0, 2000), system: String(systemPrompt).slice(0, 500) }, text);
  }
  return text;
}

// Middleware to wrap each AI request in an async-local store so we can capture req for logging
router.use((req, res, next) => {
  const feature = (req.path || '').replace(/^\//, '').split('/')[0] || 'unknown';
  asyncLocalStorage.run({ req, feature }, () => next());
});

// Logs each AI result to the ai_results JSONB store; non-fatal on failure
function logAIResult(req, feature, input, raw_text) {
  try {
    const pool = req.app.locals.pool;
    const parsed = parseAIJson(raw_text);
    saveAIResult(pool, {
      user_id: req.user?.id,
      feature,
      input,
      output: parsed,
      raw_text,
      model: DEFAULT_MODEL,
    });
  } catch (_) { /* swallow */ }
}

// Wrap callOpenRouter so every AI endpoint auto-logs to ai_results.
// To preserve original endpoint structure (which called callOpenRouter and then res.json),
// we expose a helper that does both: call AI + log + return text.
async function aiCallAndLog(req, feature, prompt, systemPrompt) {
  const text = await sharedCall(systemPrompt, prompt);
  logAIResult(req, feature, { prompt: prompt.slice(0, 2000), system: systemPrompt.slice(0, 500) }, text);
  return text;
}

// GET /api/ai/results — paginated AI history (per user)
router.get('/results', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const feature = req.query.feature;
    const params = [req.user.id];
    let where = 'user_id = $1';
    if (feature) { params.push(feature); where += ` AND feature = $${params.length}`; }
    const countQ = `SELECT COUNT(*) FROM ai_results WHERE ${where}`;
    const countR = await pool.query(countQ, params);
    const total = parseInt(countR.rows[0].count);
    params.push(limit); params.push(offset);
    const r = await pool.query(
      `SELECT id, feature, input, output, model, created_at FROM ai_results WHERE ${where}
       ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Evaluate manuscript
router.post('/evaluate-manuscript', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { title, author, genre, synopsis, word_count } = req.body;
    const systemPrompt = `You are a professional literary agent and manuscript evaluator. Provide detailed, constructive feedback. Format your response with clear sections using markdown headers (##). Include specific scores out of 10 for each category.`;
    const prompt = `Evaluate this manuscript submission:

Title: ${title}
Author: ${author}
Genre: ${genre}
Word Count: ${word_count}
Synopsis: ${synopsis}

Provide a comprehensive evaluation including:
## Overall Assessment
Rate the overall quality and provide a brief summary.

## Plot & Structure Score (X/10)
Evaluate the narrative structure, pacing, and plot development.

## Character Development Score (X/10)
Assess character depth, arcs, and relatability.

## Prose Quality Score (X/10)
Evaluate writing style, voice, and literary merit.

## Market Potential Score (X/10)
Assess commercial viability and target audience appeal.

## Recommendations
Provide 3-5 specific, actionable recommendations for improvement.

## Comparable Titles
Suggest 2-3 comparable published books in the market.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'manuscript-evaluation' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate cover design suggestions
router.post('/generate-cover', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { book_title, genre, mood, target_audience, style } = req.body;
    const systemPrompt = `You are an expert book cover designer and art director. Provide detailed, professional cover design recommendations. Use markdown formatting with clear sections.`;
    const prompt = `Create a detailed book cover design brief for:

Title: ${book_title}
Genre: ${genre}
Mood: ${mood}
Target Audience: ${target_audience}
Preferred Style: ${style}

Provide:
## Design Concept
A detailed description of the recommended cover design concept.

## Color Palette
Recommend specific colors (with hex codes) that would work well.

## Typography
Suggest font styles and hierarchy for title, subtitle, and author name.

## Imagery & Composition
Describe the visual elements, their placement, and the overall layout.

## Design Variations
Propose 3 different design approaches (minimalist, illustrated, photographic).

## Market Analysis
How this design compares to current bestseller covers in the genre.

## Print & Digital Considerations
Recommendations for both physical and digital formats.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'cover-design' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Optimize metadata
router.post('/optimize-metadata', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { book_title, description, keywords, categories } = req.body;
    const systemPrompt = `You are an expert in book metadata optimization, SEO, and discoverability on platforms like Amazon KDP, Barnes & Noble, and Apple Books. Use markdown formatting.`;
    const prompt = `Optimize the metadata for this book:

Title: ${book_title}
Current Description: ${description}
Current Keywords: ${keywords}
Categories: ${categories}

Provide:
## Optimized Description
A compelling, SEO-optimized book description (150-300 words) with emotional hooks.

## Keyword Strategy
### Primary Keywords (7)
High-volume, relevant keywords for maximum discoverability.

### Long-tail Keywords (10)
Specific phrases that target niche readers.

### Keywords to Avoid
Terms that may trigger wrong categorization.

## Category Recommendations
### Primary Categories
Best BISAC codes and their rationale.

### Secondary Categories
Additional categories for cross-listing.

## SEO Score Analysis
Rate the current metadata (X/100) and the optimized version (X/100).

## Platform-Specific Tips
Recommendations tailored for Amazon, Apple Books, and Google Play.

## A/B Testing Suggestions
2-3 description variations to test for conversion.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'metadata-optimization' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Distribution strategy
router.post('/distribution-strategy', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { book_title, genre, format, target_regions, price } = req.body;
    const systemPrompt = `You are a book distribution and pricing strategist with expertise in global publishing markets. Use markdown formatting with clear sections.`;
    const prompt = `Create a distribution strategy for:

Title: ${book_title}
Genre: ${genre}
Formats: ${format}
Target Regions: ${target_regions}
Current Price: ${price}

Provide:
## Pricing Strategy
### Recommended Price Points
By format (ebook, paperback, hardcover, audiobook) with market justification.

### Regional Pricing
Adjusted pricing for different markets (US, UK, EU, Asia).

### Promotional Pricing
Launch pricing strategy and seasonal discount recommendations.

## Distribution Channels
### Primary Channels
Top recommended platforms with pros/cons.

### Secondary Channels
Niche platforms that could boost visibility.

### Direct Sales
Recommendations for author website sales.

## Launch Timeline
A 12-week distribution rollout plan.

## Market Analysis
Current trends in the genre and how to position the book.

## Revenue Projections
Estimated revenue by channel for the first year.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'distribution-strategy' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Royalty forecast
router.post('/royalty-forecast', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { book_title, author, channel, units_sold, gross_revenue, royalty_rate, period } = req.body;
    const systemPrompt = `You are a publishing financial analyst specializing in royalty calculations and revenue forecasting. Use markdown formatting with clear sections.`;
    const prompt = `Analyze and forecast royalties for:

Title: ${book_title}
Author: ${author}
Primary Channel: ${channel}
Recent Units Sold: ${units_sold}
Recent Gross Revenue: $${gross_revenue}
Current Royalty Rate: ${royalty_rate}%
Reporting Period: ${period}

Provide:
## Current Performance Analysis
Evaluate the current sales performance and royalty earnings.

## Revenue Breakdown
### By Format
Estimated split across ebook, print, and audio.

### By Channel
Distribution of revenue across platforms.

## 12-Month Forecast
### Conservative Estimate
Minimum expected royalties with assumptions.

### Moderate Estimate
Most likely scenario based on current trends.

### Optimistic Estimate
Best case with growth assumptions.

## Growth Recommendations
### Marketing Actions
Specific actions to boost sales.

### Pricing Adjustments
Price changes that could increase total royalties.

### Seasonal Opportunities
Key sales periods to capitalize on.

## Tax Considerations
Important royalty tax implications by region.

## Payout Schedule
Expected payment timeline based on channel policies.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'royalty-forecast' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Author profile analysis
router.post('/author-analysis', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { name, genre_specialty, books_published, total_sales, bio } = req.body;
    const systemPrompt = `You are a publishing industry expert specializing in author branding and career strategy. Use markdown formatting.`;
    const prompt = `Analyze this author's profile and provide strategic recommendations:

Name: ${name}
Genre Specialty: ${genre_specialty}
Books Published: ${books_published}
Total Sales: ${total_sales}
Bio: ${bio}

## Brand Assessment
Evaluate the author's current brand positioning.
## Growth Strategy
Specific steps to grow their readership.
## Platform Recommendations
Best social media and marketing platforms for this author.
## Comparable Authors
Similar successful authors to study.
## Revenue Optimization
How to maximize earnings across formats and channels.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'author-analysis' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Series analysis
router.post('/series-analysis', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { series_name, author, genre, total_books, published_books, description } = req.body;
    const systemPrompt = `You are a book series strategist and publishing consultant. Use markdown formatting.`;
    const prompt = `Analyze this book series and provide recommendations:

Series: ${series_name}
Author: ${author}
Genre: ${genre}
Total Planned Books: ${total_books}
Published Books: ${published_books}
Description: ${description}

## Series Arc Analysis
Evaluate the series structure and pacing.
## Reader Retention Strategy
How to keep readers engaged across installments.
## Release Schedule Optimization
Optimal timing between releases.
## Cross-Promotion Opportunities
Ways to leverage the series for marketing.
## Market Position
How this series competes in its genre.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'series-analysis' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Marketing campaign optimization
router.post('/marketing-optimize', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { campaign_name, book_title, campaign_type, platform, budget, impressions, clicks, conversions } = req.body;
    const systemPrompt = `You are a book marketing expert specializing in digital advertising and reader acquisition. Use markdown formatting.`;
    const prompt = `Optimize this marketing campaign:

Campaign: ${campaign_name}
Book: ${book_title}
Type: ${campaign_type}
Platform: ${platform}
Budget: $${budget}
Impressions: ${impressions}
Clicks: ${clicks}
Conversions: ${conversions}

## Performance Analysis
Evaluate CTR, conversion rate, and cost per acquisition.
## Audience Targeting
Refine target audience segments.
## Ad Creative Recommendations
Improve ad copy, imagery, and calls to action.
## Budget Optimization
How to reallocate budget for maximum ROI.
## A/B Testing Plan
Specific tests to run for improvement.
## Scaling Strategy
How to scale winning campaigns profitably.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'marketing-optimization' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Review sentiment analysis
router.post('/review-analysis', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { book_title, reviewer_name, rating, review_text, platform } = req.body;
    const systemPrompt = `You are a publishing reputation management expert specializing in review analysis and reader feedback. Use markdown formatting.`;
    const prompt = `Analyze this book review and suggest a response strategy:

Book: ${book_title}
Reviewer: ${reviewer_name}
Platform: ${platform}
Rating: ${rating}/5
Review: ${review_text}

## Sentiment Analysis
Detailed breakdown of the reviewer's sentiment.
## Key Themes
Main themes and concerns raised.
## Suggested Response
A professional, thoughtful response to this review.
## Actionable Insights
What the author can learn from this feedback.
## Pattern Detection
Common themes if this is part of a pattern.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'review-analysis' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Print production optimization
router.post('/production-optimize', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { book_title, format, print_run, unit_cost, page_count, trim_size } = req.body;
    const systemPrompt = `You are a print production specialist with expertise in book manufacturing and cost optimization. Use markdown formatting.`;
    const prompt = `Optimize print production for:

Book: ${book_title}
Format: ${format}
Print Run: ${print_run} copies
Unit Cost: $${unit_cost}
Page Count: ${page_count}
Trim Size: ${trim_size}

## Cost Analysis
Breakdown of current production costs.
## Cost Reduction Opportunities
Specific ways to reduce per-unit cost.
## Print Run Optimization
Optimal print run size based on demand forecasting.
## Paper & Binding Recommendations
Best materials for quality and cost balance.
## Supplier Comparison
Recommended printers and their advantages.
## Sustainability Options
Eco-friendly production alternatives.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'production-optimization' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Translation market analysis
router.post('/translation-analysis', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { book_title, original_language, target_language, genre, market_potential } = req.body;
    const systemPrompt = `You are an international publishing rights expert specializing in translation markets. Use markdown formatting.`;
    const prompt = `Analyze translation potential for:

Book: ${book_title}
Original Language: ${original_language}
Target Language: ${target_language}
Genre: ${genre}
Current Market Assessment: ${market_potential}

## Market Opportunity
Size and growth of the target language market.
## Translation Quality Guidelines
Key considerations for this language pair.
## Cultural Adaptation
Elements that may need cultural localization.
## Pricing Strategy
Recommended pricing for the target market.
## Distribution Channels
Best platforms for the target market.
## ROI Projection
Expected return on translation investment.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'translation-analysis' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Pre-order launch strategy
router.post('/launch-strategy', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { book_title, launch_date, preorder_count, platform, price, email_signups } = req.body;
    const systemPrompt = `You are a book launch strategist specializing in pre-order campaigns and release day optimization. Use markdown formatting.`;
    const prompt = `Create a launch strategy for:

Book: ${book_title}
Launch Date: ${launch_date}
Pre-orders So Far: ${preorder_count}
Primary Platform: ${platform}
Price: $${price}
Email List Size: ${email_signups}

## Pre-Launch Timeline
Week-by-week action plan leading to launch.
## Pre-Order Incentives
Creative incentives to boost pre-orders.
## Email Campaign Strategy
Sequence of emails to maximize conversions.
## Social Media Plan
Platform-specific content calendar.
## Launch Day Tactics
Hour-by-hour launch day playbook.
## Post-Launch Strategy
First 30 days after launch.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'launch-strategy' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Competitive analysis
router.post('/competitive-analysis', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { title, author, genre, price, rating, rank, our_advantage } = req.body;
    const systemPrompt = `You are a competitive intelligence analyst specializing in the book publishing industry. Use markdown formatting.`;
    const prompt = `Analyze this competitor book:

Title: ${title}
Author: ${author}
Genre: ${genre}
Price: $${price}
Rating: ${rating}/5
Sales Rank: #${rank}
Our Advantage: ${our_advantage}

## Competitive Position
How this book is positioned in the market.
## Strengths Analysis
What makes this book successful.
## Vulnerabilities
Where this competitor is weak.
## Differentiation Strategy
How to differentiate our books from this competitor.
## Pricing Intelligence
How their pricing affects the market.
## Counter-Strategy
Specific actions to compete effectively.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'competitive-analysis' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reader analytics insights
router.post('/audience-insights', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { book_title, total_readers, completion_rate, demographic_data, top_regions, engagement_score } = req.body;
    const systemPrompt = `You are a data analyst specializing in reader behavior and book audience analytics. Use markdown formatting.`;
    const prompt = `Analyze reader data for:

Book: ${book_title}
Total Readers: ${total_readers}
Completion Rate: ${completion_rate}%
Demographics: ${demographic_data}
Top Regions: ${top_regions}
Engagement Score: ${engagement_score}/100

## Audience Profile
Detailed reader persona based on the data.
## Engagement Analysis
What the completion rate and engagement tell us.
## Geographic Opportunities
Markets to expand into based on regional data.
## Content Recommendations
What type of content resonates with this audience.
## Retention Strategy
How to turn readers into repeat buyers.
## Growth Opportunities
Untapped audience segments to target.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'audience-insights' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Contract negotiation tips
router.post('/contract-analysis', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { contract_title, author_name, contract_type, advance_amount, royalty_rate, territory, rights_granted } = req.body;
    const systemPrompt = `You are a publishing contract attorney and negotiation expert. Use markdown formatting.`;
    const prompt = `Analyze this publishing contract:

Contract: ${contract_title}
Author: ${author_name}
Type: ${contract_type}
Advance: $${advance_amount}
Royalty Rate: ${royalty_rate}%
Territory: ${territory}
Rights Granted: ${rights_granted}

## Contract Assessment
Overall evaluation of the terms.
## Advance Analysis
Is the advance competitive for this type of deal?
## Royalty Rate Comparison
How the rate compares to industry standards.
## Rights Evaluation
Assessment of the rights being granted.
## Negotiation Points
Key terms to negotiate for better terms.
## Red Flags
Any concerning clauses to watch for.
## Recommended Counter-Offer
Specific counter-terms to propose.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'contract-analysis' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/generate-contract
router.post('/generate-contract', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { manuscript_id, contract_type } = req.body;
    if (!manuscript_id || !['standard', 'exclusive', 'work_for_hire'].includes(contract_type)) {
      return res.status(400).json({ error: 'manuscript_id and contract_type (standard|exclusive|work_for_hire) are required' });
    }

    const msResult = await pool.query('SELECT * FROM manuscripts WHERE id = $1', [manuscript_id]);
    if (msResult.rows.length === 0) return res.status(404).json({ error: 'Manuscript not found' });
    const ms = msResult.rows[0];

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        manuscript_id INTEGER NOT NULL,
        contract_type VARCHAR(50),
        contract_text TEXT,
        advance_amount NUMERIC,
        royalty_rate NUMERIC,
        territory VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const systemPrompt = `You are a publishing attorney generating professional contract templates. Create detailed, legally-structured publishing contracts.`;
    const prompt = `Generate a ${contract_type} publishing contract for:
Title: ${ms.title}
Author: ${ms.author}
Genre: ${ms.genre}
Word Count: ${ms.word_count}

Include:
1. PARTIES section with publisher and author details (use placeholders)
2. GRANT OF RIGHTS — territory rights, format rights, exclusivity
3. ADVANCE AMOUNT — suggest appropriate advance for this type/genre
4. ROYALTY RATES — by format (print, ebook, audio) with escalators
5. REVERSION CLAUSES — conditions under which rights revert to author
6. TERM — contract duration
7. EDITORIAL REQUIREMENTS — delivery and revision obligations
8. WARRANTIES AND REPRESENTATIONS
9. TERMINATION CONDITIONS

Contract type context:
- standard: typical trade deal, non-exclusive for unspecified formats
- exclusive: all world rights, all formats, higher advance
- work_for_hire: author assigns all rights, flat fee, no royalties`;

    const contractText = await callOpenRouter(prompt, systemPrompt);

    // Extract advance amount from AI text (rough parse)
    const advanceMatch = contractText.match(/\$[\d,]+/);
    const advanceAmount = advanceMatch ? parseFloat(advanceMatch[0].replace(/[$,]/g, '')) : null;
    const royaltyMatch = contractText.match(/(\d+(?:\.\d+)?)\s*%/);
    const royaltyRate = royaltyMatch ? parseFloat(royaltyMatch[1]) : null;

    const saved = await pool.query(
      `INSERT INTO contracts (manuscript_id, contract_type, contract_text, advance_amount, royalty_rate, territory)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [manuscript_id, contract_type, contractText, advanceAmount, royaltyRate, 'World Rights']
    );

    res.json({ contract: saved.rows[0], text: contractText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/evaluate/stream?manuscriptId=X — SSE streaming evaluation
router.get('/evaluate/stream', authenticateToken, async (req, res) => {
  const { manuscriptId } = req.query;
  if (!manuscriptId) return res.status(400).json({ error: 'manuscriptId query param required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (step, data) => {
    res.write(`data: ${JSON.stringify({ step, ...data })}\n\n`);
  };

  try {
    const pool = req.app.locals.pool;
    sendEvent('start', { message: 'Fetching manuscript...' });

    const msResult = await pool.query('SELECT * FROM manuscripts WHERE id = $1', [manuscriptId]);
    if (msResult.rows.length === 0) {
      sendEvent('error', { message: 'Manuscript not found' });
      return res.end();
    }
    const ms = msResult.rows[0];
    sendEvent('fetched', { message: `Evaluating: ${ms.title}` });

    const steps = [
      { step: 'plot_analysis', label: 'Analyzing plot structure...' },
      { step: 'character_review', label: 'Reviewing character development...' },
      { step: 'prose_evaluation', label: 'Evaluating prose quality...' },
      { step: 'market_assessment', label: 'Assessing market potential...' },
      { step: 'final_report', label: 'Generating final report...' },
    ];

    const results = {};
    for (const s of steps) {
      sendEvent(s.step, { message: s.label, progress: steps.indexOf(s) + 1, total: steps.length });
      const prompt = `For manuscript titled "${ms.title}" (genre: ${ms.genre}, word count: ${ms.word_count}):
Synopsis: ${ms.synopsis || 'Not provided'}
Evaluate specifically: ${s.label}. Provide 2-3 sentences of concise expert feedback.`;
      const result = await callOpenRouter(prompt, 'You are a professional literary agent evaluating manuscripts. Be concise and specific.');
      results[s.step] = result;
      sendEvent(`${s.step}_complete`, { message: `Completed: ${s.label}`, result });
    }

    sendEvent('done', { message: 'Evaluation complete', results });
    res.end();
  } catch (err) {
    sendEvent('error', { message: err.message });
    res.end();
  }
});

// POST /api/ai/competitive-analysis-advanced — genre/market competitive analysis
router.post('/competitive-analysis-advanced', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { genre, target_market, themes } = req.body;
    if (!genre || !target_market) return res.status(400).json({ error: 'genre and target_market are required' });

    const systemPrompt = `You are a publishing market research specialist with deep knowledge of book market trends, comparable titles, and positioning strategy. Use markdown formatting.`;
    const prompt = `Perform a competitive market analysis for a new book:

Genre: ${genre}
Target Market: ${target_market}
Themes: ${Array.isArray(themes) ? themes.join(', ') : themes || 'general'}

Provide:
## Comparable Titles (Comps)
List 5 recently published (2020-2024) comparable titles with author, publisher, sales estimate.

## Market Trends
Key trends currently driving this genre/market.

## Reader Demographics
Who buys these books? Age, income, reading habits.

## Positioning Recommendations
How to position the new book to stand out.

## Suggested Retail Price Range
By format (ebook, paperback, hardcover) with justification.

## Competition Level
Low/Medium/High with reasoning.

## Opportunity Score
Rate the market opportunity (1-10) with explanation.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'competitive-analysis-advanced', genre, target_market, themes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// NEW AI FEATURES (per audit: 8 proposed advanced AI tools)
// ============================================================================

// POST /api/ai/genre-trends - Genre Trend Analyzer
router.post('/genre-trends', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { genre, timeframe, regions } = req.body;
    const systemPrompt = `You are a publishing market research analyst specializing in book genre trend identification using sales pattern analysis. Use markdown formatting.`;
    const prompt = `Analyze emerging trends for the ${genre || 'general fiction'} genre over ${timeframe || 'the last 12 months'} in ${regions || 'global markets'}.

Provide:
## Emerging Sub-Genres
3-5 hot sub-genres rising in popularity with momentum indicators.

## Theme Trends
Themes resonating with readers right now (with reasoning).

## Format Trends
Performance shifts across ebook/audio/print.

## Reader Demographic Shifts
Changes in age, income, geography of buyers.

## Optimal Launch Windows
Best months/quarters to launch in this genre.

## Saturation Risk
Where the genre is overcrowded vs underserved.

## Action Recommendations
3 specific actions a publisher should take in the next 90 days.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'genre-trends' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/reader-demographic - Reader Demographic Predictor
router.post('/reader-demographic', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { title, genre, synopsis, themes, sample_text } = req.body;
    const systemPrompt = `You are a literary marketing analyst predicting target reader demographics from manuscript content alone using stylometric and thematic signals.`;
    const prompt = `Predict the target audience for this manuscript:

Title: ${title}
Genre: ${genre}
Themes: ${themes}
Synopsis: ${synopsis}
Sample text: ${sample_text || 'N/A'}

Provide:
## Primary Reader Persona
Detailed description: age range, gender skew, income, education, lifestyle.

## Secondary Audience Segments
2-3 adjacent reader groups with crossover potential.

## Geographic Concentration
Top 5 markets/regions where this would resonate.

## Channel Affinity
Which retail channels (Amazon, Apple, indie bookstores, libraries) the target reads most.

## Comparable Reader Communities
Specific communities, subreddits, or book clubs.

## Marketing Implications
How to reach this audience cost-effectively.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'reader-demographic' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/plagiarism-check - Manuscript Plagiarism Detector
router.post('/plagiarism-check', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { title, sample_text, genre } = req.body;
    const systemPrompt = `You are a literary forensics expert detecting potential plagiarism, structural mimicry, and unintentional similarity to published works.`;
    const prompt = `Analyze this manuscript excerpt for potential plagiarism risk:

Title: ${title}
Genre: ${genre}
Sample text: ${sample_text}

Provide:
## Originality Score (0-100)
Quantitative assessment with rationale.

## Phrase Analysis
Notable phrases or sentences that match common literary tropes or specific known works.

## Structural Similarity
Plot beats, character archetypes, or narrative structure overlapping with existing works.

## Style Mimicry Detection
Whether the prose style closely mimics a specific famous author.

## Risk Areas
Specific passages that warrant deeper professional plagiarism check.

## Mitigation Recommendations
How the author can rewrite to reduce inadvertent similarity.

## Verdict
ORIGINAL / NEEDS_REVIEW / HIGH_RISK with reasoning.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'plagiarism-check' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/multilang-evaluate - Multi-Language Manuscript Evaluator
router.post('/multilang-evaluate', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { title, language, genre, synopsis, sample_text, target_markets } = req.body;
    const systemPrompt = `You are an international literary scout fluent in evaluating manuscripts in their original language and recommending translation potential.`;
    const prompt = `Evaluate this non-English manuscript for translation potential:

Title: ${title}
Original Language: ${language}
Genre: ${genre}
Synopsis: ${synopsis}
Sample: ${sample_text || 'N/A'}
Target Translation Markets: ${target_markets || 'English-speaking'}

Provide:
## Literary Quality Assessment
In-language evaluation of prose, structure, character work.

## Translation Worthiness Score (0-100)
With clear rationale.

## Cultural Translatability
Which themes/elements transfer well; which require adaptation.

## Target Market Fit
For each requested market: appeal score and reasoning.

## Recommended Translator Profile
Skills/specialty needed.

## Estimated Translation Investment
Rough cost & time guidance.

## Comparable Translated Successes
Books that succeeded in same language pair.

## Recommendation
TRANSLATE / SECOND_OPINION / DO_NOT_TRANSLATE with reasoning.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'multilang-evaluate' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/rights-advisor - Rights Management Advisor
router.post('/rights-advisor', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { title, genre, author_profile, current_rights, target_markets } = req.body;
    const systemPrompt = `You are a subsidiary rights expert advising publishers on optimal rights monetization strategies.`;
    const prompt = `Recommend subsidiary rights strategy for:

Title: ${title}
Genre: ${genre}
Author Profile: ${author_profile}
Current Rights Held: ${current_rights}
Target Markets: ${target_markets}

Provide:
## Rights Inventory Analysis
What's owned vs. what's available to monetize.

## Audio Rights Strategy
Likelihood of licensing, recommended platforms, expected advance ranges.

## Translation Rights Priority
Top 5 language markets to pursue, in order, with rationale.

## Film/TV Rights Outlook
Adaptability score, comp deals, recommended approach (option vs. shopping).

## Merchandising Potential
If applicable for the genre.

## Serial/Excerpt Rights
Magazines or platforms to pitch.

## Anthology/Collection Opportunities
Where the work could be included.

## Negotiation Priority Order
Which rights to license first for maximum total revenue.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'rights-advisor' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/pricing-optimizer - Pricing Optimizer by Cohort
router.post('/pricing-optimizer', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { title, genre, format, current_price, demographic, season, competitors } = req.body;
    const systemPrompt = `You are a publishing pricing strategist using cohort-based dynamic pricing. Use markdown formatting.`;
    const prompt = `Optimize pricing for:

Title: ${title}
Genre: ${genre}
Format: ${format}
Current Price: $${current_price}
Target Demographic: ${demographic}
Current Season: ${season}
Key Competitor Pricing: ${competitors}

Provide:
## Demographic-Adjusted Pricing
Price recommendations per reader cohort (price-sensitive vs. premium).

## Seasonal Adjustment
Recommended price calendar with markdown/markup windows.

## Competitive Position
Where current price sits vs comp set; recommended adjustment.

## Bundle/Tier Strategy
Multi-format bundle pricing to maximize ARPU.

## Promotional Timing
Specific dates/triggers for limited-time discounts.

## Revenue Sensitivity
Estimated revenue impact at +/- 10% / 20% price points.

## Recommended Action
Specific new price + rollout plan.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'pricing-optimizer' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/blurb-generator - Blurb/Tagline Generator
router.post('/blurb-generator', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { title, author, genre, synopsis, mood, length } = req.body;
    const systemPrompt = `You are a senior book copywriter specializing in punchy, conversion-driving back-cover blurbs and taglines.`;
    const prompt = `Generate book copy variations for:

Title: ${title}
Author: ${author}
Genre: ${genre}
Synopsis: ${synopsis}
Tone/Mood: ${mood}
Preferred Length: ${length || 'short and long versions'}

Provide:
## 10 Tagline Options
Numbered, each <=12 words. Mix of intrigue, promise, emotion.

## 5 Short Blurbs (50-75 words each)
Numbered, optimized for online retailer description.

## 3 Long Back-Cover Blurbs (150-200 words)
Numbered, with hook, stakes, and emotional payoff.

## 5 Social Media Captions
Twitter/X, Instagram, TikTok-friendly.

## A/B Testing Recommendation
Which two variations to test first and why.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'blurb-generator' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/review-aggregator - Reader Review Aggregator
router.post('/review-aggregator', authenticateToken, aiRateLimit, async (req, res) => {
  try {
    const { book_title, reviews, time_window } = req.body;
    const systemPrompt = `You are a reader feedback analyst summarizing aggregated reviews into actionable author/publisher insights.`;
    const prompt = `Aggregate and analyze these reader reviews:

Book: ${book_title}
Time Window: ${time_window || 'recent'}
Reviews (concatenated):
${reviews}

Provide:
## Sentiment Summary
Overall sentiment distribution (% positive / neutral / negative) and trend over time.

## Top Praise Themes
Top 5 things readers love (with example quotes).

## Top Criticism Themes
Top 5 recurring complaints (with example quotes).

## Reader Demographic Signals
What the reviews reveal about who's reading.

## Comparable Books Mentioned
Which other books readers compared this to.

## Marketing Insights
Phrases readers used that could become marketing copy.

## Author Action Items
3-5 specific actions for the author/publisher based on feedback.`;
    const result = await callOpenRouter(prompt, systemPrompt);
    res.json({ result, type: 'review-aggregator' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
