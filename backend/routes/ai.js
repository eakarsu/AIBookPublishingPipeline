const router = require('express').Router();
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');

async function callOpenRouter(prompt, systemPrompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Book Publishing Pipeline'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
}

// Evaluate manuscript
router.post('/evaluate-manuscript', authenticateToken, async (req, res) => {
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
router.post('/generate-cover', authenticateToken, async (req, res) => {
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
router.post('/optimize-metadata', authenticateToken, async (req, res) => {
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
router.post('/distribution-strategy', authenticateToken, async (req, res) => {
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
router.post('/royalty-forecast', authenticateToken, async (req, res) => {
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
router.post('/author-analysis', authenticateToken, async (req, res) => {
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
router.post('/series-analysis', authenticateToken, async (req, res) => {
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
router.post('/marketing-optimize', authenticateToken, async (req, res) => {
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
router.post('/review-analysis', authenticateToken, async (req, res) => {
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
router.post('/production-optimize', authenticateToken, async (req, res) => {
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
router.post('/translation-analysis', authenticateToken, async (req, res) => {
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
router.post('/launch-strategy', authenticateToken, async (req, res) => {
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
router.post('/competitive-analysis', authenticateToken, async (req, res) => {
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
router.post('/audience-insights', authenticateToken, async (req, res) => {
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
router.post('/contract-analysis', authenticateToken, async (req, res) => {
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

module.exports = router;
