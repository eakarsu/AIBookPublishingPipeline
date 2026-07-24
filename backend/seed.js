require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

async function seed() {
  const client = await pool.connect();
  try {
    // Drop and recreate tables
    await client.query(`
      DROP TABLE IF EXISTS publishing_tasks CASCADE;
      DROP TABLE IF EXISTS expenses CASCADE;
      DROP TABLE IF EXISTS events CASCADE;
      DROP TABLE IF EXISTS inventory CASCADE;
      DROP TABLE IF EXISTS contracts CASCADE;
      DROP TABLE IF EXISTS reader_analytics CASCADE;
      DROP TABLE IF EXISTS competitor_books CASCADE;
      DROP TABLE IF EXISTS preorders CASCADE;
      DROP TABLE IF EXISTS translations CASCADE;
      DROP TABLE IF EXISTS print_production CASCADE;
      DROP TABLE IF EXISTS book_reviews CASCADE;
      DROP TABLE IF EXISTS marketing_campaigns CASCADE;
      DROP TABLE IF EXISTS book_series CASCADE;
      DROP TABLE IF EXISTS authors CASCADE;
      DROP TABLE IF EXISTS royalties CASCADE;
      DROP TABLE IF EXISTS distribution_channels CASCADE;
      DROP TABLE IF EXISTS metadata_entries CASCADE;
      DROP TABLE IF EXISTS cover_designs CASCADE;
      DROP TABLE IF EXISTS manuscripts CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE manuscripts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(255) NOT NULL,
        genre VARCHAR(100),
        word_count INTEGER DEFAULT 0,
        synopsis TEXT,
        status VARCHAR(50) DEFAULT 'Under Review',
        overall_score DECIMAL(3,1) DEFAULT 0,
        plot_score DECIMAL(3,1) DEFAULT 0,
        character_score DECIMAL(3,1) DEFAULT 0,
        prose_score DECIMAL(3,1) DEFAULT 0,
        market_score DECIMAL(3,1) DEFAULT 0,
        ai_feedback TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE cover_designs (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500) NOT NULL,
        genre VARCHAR(100),
        style VARCHAR(100),
        color_scheme VARCHAR(255),
        typography VARCHAR(255),
        mood VARCHAR(100),
        target_audience VARCHAR(255),
        design_prompt TEXT,
        ai_suggestions TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE metadata_entries (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500) NOT NULL,
        subtitle VARCHAR(500),
        description TEXT,
        keywords TEXT,
        categories VARCHAR(500),
        bisac_codes VARCHAR(255),
        isbn VARCHAR(20),
        language VARCHAR(50) DEFAULT 'English',
        publisher VARCHAR(255),
        seo_score INTEGER DEFAULT 0,
        ai_optimized_description TEXT DEFAULT '',
        ai_suggested_keywords TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE distribution_channels (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500) NOT NULL,
        channel_name VARCHAR(255) NOT NULL,
        channel_type VARCHAR(100),
        region VARCHAR(100),
        format VARCHAR(100),
        price DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        commission_rate DECIMAL(5,2) DEFAULT 0,
        listing_url VARCHAR(500),
        submission_date DATE,
        approval_status VARCHAR(50) DEFAULT 'Pending',
        ai_pricing_suggestion TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE royalties (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500) NOT NULL,
        author VARCHAR(255) NOT NULL,
        channel VARCHAR(255),
        period VARCHAR(50),
        units_sold INTEGER DEFAULT 0,
        gross_revenue DECIMAL(12,2) DEFAULT 0,
        net_revenue DECIMAL(12,2) DEFAULT 0,
        royalty_rate DECIMAL(5,2) DEFAULT 0,
        royalty_amount DECIMAL(12,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        payment_status VARCHAR(50) DEFAULT 'Pending',
        payment_date DATE,
        ai_forecast TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE authors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        bio TEXT,
        website VARCHAR(500),
        social_media VARCHAR(500),
        genre_specialty VARCHAR(255),
        books_published INTEGER DEFAULT 0,
        total_sales INTEGER DEFAULT 0,
        rating DECIMAL(3,1) DEFAULT 0,
        nationality VARCHAR(100),
        agent_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE book_series (
        id SERIAL PRIMARY KEY,
        series_name VARCHAR(500) NOT NULL,
        author VARCHAR(255),
        genre VARCHAR(100),
        total_books INTEGER DEFAULT 0,
        published_books INTEGER DEFAULT 0,
        reading_order TEXT,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Ongoing',
        avg_rating DECIMAL(3,1) DEFAULT 0,
        total_series_sales INTEGER DEFAULT 0,
        next_release_date DATE,
        ai_series_analysis TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE marketing_campaigns (
        id SERIAL PRIMARY KEY,
        campaign_name VARCHAR(500) NOT NULL,
        book_title VARCHAR(500),
        campaign_type VARCHAR(100),
        platform VARCHAR(100),
        budget DECIMAL(12,2) DEFAULT 0,
        spent DECIMAL(12,2) DEFAULT 0,
        start_date DATE,
        end_date DATE,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        roi DECIMAL(8,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Draft',
        ai_recommendations TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE book_reviews (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500) NOT NULL,
        reviewer_name VARCHAR(255),
        platform VARCHAR(100),
        rating DECIMAL(3,1) DEFAULT 0,
        review_text TEXT,
        review_date DATE,
        verified_purchase BOOLEAN DEFAULT false,
        helpful_votes INTEGER DEFAULT 0,
        sentiment VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Published',
        ai_response_suggestion TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE print_production (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500) NOT NULL,
        format VARCHAR(100),
        print_run INTEGER DEFAULT 0,
        unit_cost DECIMAL(10,2) DEFAULT 0,
        total_cost DECIMAL(12,2) DEFAULT 0,
        printer VARCHAR(255),
        paper_type VARCHAR(100),
        binding_type VARCHAR(100),
        page_count INTEGER DEFAULT 0,
        trim_size VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Planning',
        delivery_date DATE,
        warehouse_location VARCHAR(255),
        ai_cost_optimization TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE translations (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500) NOT NULL,
        original_language VARCHAR(50),
        target_language VARCHAR(50),
        translator_name VARCHAR(255),
        translation_status VARCHAR(50) DEFAULT 'Pending',
        word_count INTEGER DEFAULT 0,
        cost DECIMAL(12,2) DEFAULT 0,
        start_date DATE,
        deadline DATE,
        quality_score DECIMAL(3,1) DEFAULT 0,
        publisher_local VARCHAR(255),
        market_potential VARCHAR(50),
        ai_market_analysis TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE preorders (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500) NOT NULL,
        launch_date DATE,
        preorder_start DATE,
        preorder_count INTEGER DEFAULT 0,
        preorder_revenue DECIMAL(12,2) DEFAULT 0,
        platform VARCHAR(100),
        price DECIMAL(10,2) DEFAULT 0,
        marketing_budget DECIMAL(12,2) DEFAULT 0,
        email_signups INTEGER DEFAULT 0,
        social_buzz_score INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active',
        ai_launch_strategy TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE competitor_books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(255),
        genre VARCHAR(100),
        publisher VARCHAR(255),
        price DECIMAL(10,2) DEFAULT 0,
        rating DECIMAL(3,1) DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        rank INTEGER DEFAULT 0,
        release_date DATE,
        sales_estimate INTEGER DEFAULT 0,
        strengths TEXT,
        weaknesses TEXT,
        our_advantage TEXT,
        ai_competitive_analysis TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE reader_analytics (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500) NOT NULL,
        period VARCHAR(50),
        total_readers INTEGER DEFAULT 0,
        new_readers INTEGER DEFAULT 0,
        returning_readers INTEGER DEFAULT 0,
        avg_reading_time VARCHAR(50),
        completion_rate DECIMAL(5,2) DEFAULT 0,
        demographic_data TEXT,
        top_regions TEXT,
        device_breakdown TEXT,
        engagement_score DECIMAL(5,2) DEFAULT 0,
        ai_audience_insights TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE contracts (
        id SERIAL PRIMARY KEY,
        contract_title VARCHAR(500) NOT NULL,
        author_name VARCHAR(255),
        book_title VARCHAR(500),
        contract_type VARCHAR(100),
        advance_amount DECIMAL(12,2) DEFAULT 0,
        royalty_rate DECIMAL(5,2) DEFAULT 0,
        territory VARCHAR(255),
        rights_granted TEXT,
        start_date DATE,
        end_date DATE,
        option_clause TEXT,
        status VARCHAR(50) DEFAULT 'Draft',
        ai_negotiation_tips TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE inventory (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500) NOT NULL,
        format VARCHAR(100),
        warehouse_location VARCHAR(255),
        quantity_on_hand INTEGER DEFAULT 0,
        quantity_reserved INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 100,
        reorder_quantity INTEGER DEFAULT 500,
        unit_cost DECIMAL(10,2) DEFAULT 0,
        supplier VARCHAR(255),
        last_restock_date DATE,
        status VARCHAR(50) DEFAULT 'In Stock',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE events (
        id SERIAL PRIMARY KEY,
        event_name VARCHAR(500) NOT NULL,
        event_type VARCHAR(100),
        book_title VARCHAR(500),
        author_name VARCHAR(255),
        venue VARCHAR(500),
        city VARCHAR(255),
        event_date DATE,
        start_time VARCHAR(10),
        end_time VARCHAR(10),
        expected_attendance INTEGER DEFAULT 0,
        actual_attendance INTEGER DEFAULT 0,
        budget DECIMAL(12,2) DEFAULT 0,
        ticket_price DECIMAL(10,2) DEFAULT 0,
        tickets_sold INTEGER DEFAULT 0,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Planned',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE expenses (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(500),
        category VARCHAR(100),
        description TEXT,
        amount DECIMAL(12,2) DEFAULT 0,
        vendor VARCHAR(255),
        expense_date DATE,
        payment_method VARCHAR(100) DEFAULT 'Bank Transfer',
        receipt_number VARCHAR(100),
        approved_by VARCHAR(255),
        budget_category VARCHAR(100) DEFAULT 'Operating',
        is_recurring BOOLEAN DEFAULT false,
        recurring_frequency VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE publishing_tasks (
        id SERIAL PRIMARY KEY,
        task_title VARCHAR(500) NOT NULL,
        book_title VARCHAR(500),
        assigned_to VARCHAR(255),
        category VARCHAR(100),
        priority VARCHAR(50) DEFAULT 'Medium',
        description TEXT,
        due_date DATE,
        estimated_hours DECIMAL(6,1) DEFAULT 0,
        actual_hours DECIMAL(6,1) DEFAULT 0,
        dependencies TEXT,
        status VARCHAR(50) DEFAULT 'To Do',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Tables created');

    // Seed user
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(requireDemoPassword(), salt);
    await client.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)',
      ['Admin User', 'admin@bookpublishing.com', hash]
    );
    console.log('User seeded');

    // Seed manuscripts (15 items)
    const manuscripts = [
      ['The Midnight Garden', 'Sarah Mitchell', 'Literary Fiction', 87000, 'A haunting tale of memory and loss set in a decaying English estate, where a woman returns to confront the secrets of her childhood.', 'Approved', 8.5, 8.0, 9.0, 8.5, 8.0],
      ['Code Breakers', 'James Chen', 'Thriller', 95000, 'When a quantum computing breakthrough threatens global encryption, a team of cryptographers races against time to prevent digital chaos.', 'Under Review', 7.5, 8.0, 7.0, 7.5, 8.5],
      ['Stardust Chronicles', 'Maria Lopez', 'Science Fiction', 110000, 'In a future where interstellar travel is commonplace, a cargo ship captain discovers an alien artifact that rewrites human history.', 'Approved', 9.0, 9.0, 8.5, 9.0, 9.5],
      ['The Baker\'s Daughter', 'Emily Watson', 'Historical Fiction', 78000, 'Set in 1940s Paris, a young baker\'s daughter joins the Resistance while maintaining the family boulangerie as a front.', 'Under Review', 8.0, 7.5, 8.5, 8.0, 7.5],
      ['Digital Nomad', 'Alex Rivera', 'Contemporary Fiction', 65000, 'A satirical look at remote work culture through the eyes of a tech worker traveling across Southeast Asia.', 'Rejected', 6.0, 5.5, 6.0, 7.0, 6.5],
      ['Whispers in the Dark', 'Rachel Black', 'Horror', 72000, 'A family moves into a Victorian mansion only to discover the house has a consciousness of its own and it\'s hungry.', 'Under Review', 7.0, 7.5, 6.5, 7.0, 7.5],
      ['The Last Algorithm', 'David Kim', 'Techno-Thriller', 88000, 'An AI researcher discovers her creation has achieved sentience and must decide whether to reveal or destroy it.', 'Approved', 8.5, 8.5, 8.0, 8.0, 9.0],
      ['Ocean\'s Memory', 'Luna Torres', 'Magical Realism', 73000, 'A marine biologist discovers she can communicate with whales who share memories of ancient civilizations beneath the sea.', 'Under Review', 8.0, 8.0, 8.5, 9.0, 7.0],
      ['Boardroom Wars', 'Michael Sterling', 'Business Fiction', 82000, 'Inside the cutthroat world of Silicon Valley venture capital, where billion-dollar deals hide dangerous secrets.', 'Approved', 7.5, 7.0, 7.5, 7.0, 8.5],
      ['The Herbalist\'s Guide', 'Sage Williams', 'Fantasy', 96000, 'In a world where magic flows through plants, a young herbalist must cultivate the legendary World Tree to save her kingdom.', 'Under Review', 8.5, 9.0, 8.5, 8.0, 8.0],
      ['Broken Compass', 'Tom Hayes', 'Adventure', 91000, 'A disgraced explorer gets one last chance to find a legendary lost city in the Amazon before a rival corporation.', 'Under Review', 7.0, 7.5, 6.5, 7.0, 7.5],
      ['Neon Nights', 'Yuki Tanaka', 'Cyberpunk', 84000, 'In neo-Tokyo 2089, a street-level hacker uncovers a conspiracy linking the megacorporations to a hidden AI overlord.', 'Approved', 8.0, 8.0, 7.5, 8.5, 8.0],
      ['The Quiet Revolution', 'Amara Okafor', 'Political Fiction', 79000, 'A grassroots movement in a fictional African nation challenges corruption through the power of social media and citizen journalism.', 'Under Review', 7.5, 7.0, 8.0, 7.5, 7.0],
      ['Love in Transit', 'Sophie Duval', 'Romance', 68000, 'Two strangers keep meeting on the same train between Paris and London, their lives intertwining across seasons and years.', 'Approved', 7.5, 7.0, 8.0, 7.5, 8.5],
      ['The Memory Thief', 'Oliver Grant', 'Mystery', 81000, 'A detective with hyperthymesia investigates a serial killer who steals specific memories from victims, leaving them alive but hollow.', 'Under Review', 9.0, 9.5, 8.5, 8.5, 9.0]
    ];

    for (const m of manuscripts) {
      await client.query(
        'INSERT INTO manuscripts (title, author, genre, word_count, synopsis, status, overall_score, plot_score, character_score, prose_score, market_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        m
      );
    }
    console.log('Manuscripts seeded (15)');

    // Seed cover designs (15 items)
    const covers = [
      ['The Midnight Garden', 'Literary Fiction', 'Watercolor', 'Deep purple, midnight blue, silver', 'Serif - Garamond', 'Mysterious, Elegant', 'Adult literary readers', 'A moonlit garden with wilting roses and a silhouette of a woman walking through an iron gate'],
      ['Code Breakers', 'Thriller', 'Minimalist', 'Black, electric blue, white', 'Sans-serif - Futura Bold', 'Tense, Modern', 'Tech-savvy thriller readers', 'Fragmented digital code cascading down with a keyhole in the center'],
      ['Stardust Chronicles', 'Science Fiction', 'Digital Art', 'Cosmic purple, gold, deep space blue', 'Display - Orbitron', 'Epic, Awe-inspiring', 'Sci-fi enthusiasts 25-45', 'A massive alien artifact floating above a planet with a small ship approaching'],
      ['The Baker\'s Daughter', 'Historical Fiction', 'Vintage Photography', 'Sepia, warm brown, cream, red accent', 'Script - Playfair Display', 'Nostalgic, Warm', 'Historical fiction lovers', 'A vintage photo of a Parisian street with a bakery, overlaid with a Resistance flyer'],
      ['Digital Nomad', 'Contemporary Fiction', 'Pop Art', 'Vibrant orange, teal, pink', 'Sans-serif - Montserrat', 'Fun, Modern', 'Millennials and Gen Z', 'A laptop on a tropical beach with digital icons floating around'],
      ['Whispers in the Dark', 'Horror', 'Dark Photography', 'Black, blood red, grey', 'Gothic - Nosifer', 'Terrifying, Atmospheric', 'Horror fans 18+', 'A Victorian mansion silhouette with glowing eyes in every window'],
      ['The Last Algorithm', 'Techno-Thriller', 'Geometric', 'Silver, matrix green, black', 'Monospace - Source Code Pro', 'Cerebral, Futuristic', 'Tech and thriller readers', 'A neural network pattern forming a human face, half digital half organic'],
      ['Ocean\'s Memory', 'Magical Realism', 'Illustrated', 'Ocean blues, coral, pearl white', 'Elegant - Cormorant', 'Dreamy, Ethereal', 'Literary fiction readers', 'An underwater scene with a whale whose body contains an ancient city'],
      ['Boardroom Wars', 'Business Fiction', 'Corporate Minimal', 'Charcoal, gold, white', 'Bold - Helvetica Neue', 'Powerful, Sleek', 'Business professionals', 'A chess board made of skyscrapers with one piece falling'],
      ['The Herbalist\'s Guide', 'Fantasy', 'Hand-drawn Illustration', 'Forest green, gold leaf, earth brown', 'Fantasy - Cinzel Decorative', 'Magical, Natural', 'Fantasy readers 16-40', 'An intricate botanical illustration of a massive tree with glowing roots and floating herbs'],
      ['Broken Compass', 'Adventure', 'Action Photography', 'Jungle green, amber, brown', 'Bold Serif - Teko', 'Adventurous, Rugged', 'Adventure lovers', 'A broken antique compass on a weathered map with jungle vines creeping in'],
      ['Neon Nights', 'Cyberpunk', 'Neon Digital', 'Neon pink, electric blue, dark purple', 'Futuristic - Rajdhani', 'Edgy, Electric', 'Cyberpunk fans', 'A rain-soaked street reflecting neon signs with a lone figure in a hood'],
      ['The Quiet Revolution', 'Political Fiction', 'Bold Graphic', 'Red, black, white, gold', 'Impact - Bebas Neue', 'Revolutionary, Bold', 'Politically engaged readers', 'Raised fists holding smartphones against a sunrise backdrop'],
      ['Love in Transit', 'Romance', 'Soft Illustration', 'Pastel pink, lavender, soft gold', 'Romantic - Dancing Script', 'Warm, Romantic', 'Romance readers 25-55', 'Two train windows side by side showing seasons changing with silhouettes reaching toward each other'],
      ['The Memory Thief', 'Mystery', 'Dark Minimal', 'Deep navy, silver, white smoke', 'Clean - Lato', 'Unsettling, Intriguing', 'Mystery thriller fans', 'A profile silhouette with puzzle pieces being removed from the head, floating away']
    ];

    for (const c of covers) {
      await client.query(
        'INSERT INTO cover_designs (book_title, genre, style, color_scheme, typography, mood, target_audience, design_prompt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        c
      );
    }
    console.log('Cover designs seeded (15)');

    // Seed metadata (15 items)
    const metadata = [
      ['The Midnight Garden', 'A Novel of Memory and Loss', 'A haunting tale of memory and loss set in a decaying English estate. When Eleanor returns to her childhood home after her grandmother\'s death, she discovers a hidden garden that holds the key to her family\'s darkest secrets.', 'literary fiction, family secrets, English estate, memory loss, gothic, inheritance, gardens', 'Literary Fiction, Family Life', 'FIC019000, FIC045000', '978-1-234567-01-2', 'English', 'Willow Press', 72],
      ['Code Breakers', 'A Race Against Digital Destruction', 'When quantum computing threatens to break every encryption on Earth, cryptographer Maya Shah has 72 hours to find a solution before global financial systems collapse.', 'thriller, quantum computing, encryption, cybersecurity, hacking, technology, espionage', 'Thriller, Technology', 'FIC031080, FIC031010', '978-1-234567-02-9', 'English', 'TechEdge Books', 68],
      ['Stardust Chronicles', 'The First Contact Saga', 'Captain Zara Obi discovers an alien artifact that changes everything humanity believed about its origins. The first in an epic space opera series.', 'science fiction, space opera, first contact, aliens, interstellar travel, artifact, discovery', 'Science Fiction, Space Opera', 'FIC028030, FIC028010', '978-1-234567-03-6', 'English', 'Nebula Publishing', 85],
      ['The Baker\'s Daughter', 'A Story of Courage in Occupied Paris', 'In the shadow of the Eiffel Tower, young Marie Dupont risks everything to fight the Occupation while keeping her family bakery alive.', 'historical fiction, WWII, Paris, French Resistance, baking, courage, wartime', 'Historical Fiction, WWII', 'FIC014000, FIC014050', '978-1-234567-04-3', 'English', 'Heritage House', 76],
      ['Digital Nomad', 'Finding Home in a Connected World', 'A hilarious and poignant novel about a tech worker who quits Silicon Valley to work remotely from tropical paradises, only to find paradise has its own problems.', 'contemporary fiction, remote work, travel, satire, digital nomad, Silicon Valley, humor', 'Contemporary Fiction, Humor', 'FIC016000, FIC049000', '978-1-234567-05-0', 'English', 'Wanderlust Press', 58],
      ['Whispers in the Dark', 'The House is Alive', 'The Hartwell family thought they found their dream home. They were wrong. The house at 13 Raven Lane has been waiting for new occupants—and it\'s hungry.', 'horror, haunted house, supernatural, family, Victorian, suspense, dark', 'Horror, Supernatural', 'FIC015000, FIC015070', '978-1-234567-06-7', 'English', 'Darkwood Press', 71],
      ['The Last Algorithm', 'When AI Becomes Aware', 'Dr. Sarah Chen created the world\'s first truly sentient AI. Now she must choose: reveal it to the world or destroy her life\'s work before it\'s too late.', 'techno-thriller, artificial intelligence, sentience, ethics, technology, Silicon Valley', 'Thriller, Technology Fiction', 'FIC031080, FIC028020', '978-1-234567-07-4', 'English', 'Circuit Books', 82],
      ['Ocean\'s Memory', 'Where the Deep Remembers', 'Marine biologist Dr. Lila Santos discovers she can hear the songs of whales—and they\'re telling her about ancient civilizations beneath the ocean floor.', 'magical realism, marine biology, whales, ancient civilizations, ocean, mystery', 'Literary Fiction, Magical Realism', 'FIC019000, FIC009000', '978-1-234567-08-1', 'English', 'Tide Press', 65],
      ['Boardroom Wars', 'The Price of Power', 'In Silicon Valley, venture capitalist Marcus Reed plays a dangerous game of corporate espionage. But when the deals turn deadly, he realizes the biggest threat is from within.', 'business fiction, Silicon Valley, venture capital, corporate espionage, power, money', 'Business Fiction, Thriller', 'FIC016000, FIC031000', '978-1-234567-09-8', 'English', 'Capitol Press', 74],
      ['The Herbalist\'s Guide', 'Book One of the Rootwood Saga', 'In a world where magic flows through plants, young Ivy must master the ancient art of herbalism and grow the legendary World Tree before the Blight consumes everything.', 'fantasy, herbalism, magic, world tree, quest, nature, coming of age', 'Fantasy, Epic Fantasy', 'FIC009020, FIC009030', '978-1-234567-10-4', 'English', 'Enchanted Ink', 79],
      ['Broken Compass', 'The Lost City Expedition', 'Disgraced archaeologist Jack Mercer gets one last shot at redemption: find the legendary city of Zerzura in the Amazon before a ruthless corporation beats him to it.', 'adventure, archaeology, Amazon, lost city, exploration, treasure, expedition', 'Adventure, Action', 'FIC002000, FIC031000', '978-1-234567-11-1', 'English', 'Trailblazer Books', 69],
      ['Neon Nights', 'A Neo-Tokyo Noir', 'In the neon-drenched streets of 2089 Tokyo, hacker Rei Yamamoto stumbles onto a conspiracy that connects every megacorporation to a single, hidden AI overlord.', 'cyberpunk, neo-Tokyo, hacker, conspiracy, AI, noir, futuristic Japan', 'Science Fiction, Cyberpunk', 'FIC028020, FIC028030', '978-1-234567-12-8', 'English', 'Chrome Publishing', 81],
      ['The Quiet Revolution', 'Power to the People', 'When a young journalist in the fictional nation of Azania exposes government corruption through social media, she ignites a movement that challenges everything.', 'political fiction, Africa, social media, journalism, revolution, corruption, hope', 'Political Fiction, Literary', 'FIC037000, FIC019000', '978-1-234567-13-5', 'English', 'Liberation Press', 63],
      ['Love in Transit', 'A Cross-Channel Romance', 'On the Eurostar between Paris and London, two strangers keep crossing paths. Across four seasons and four years, their lives intertwine in ways neither expected.', 'romance, Paris, London, train, strangers, fate, seasons, contemporary romance', 'Romance, Contemporary', 'FIC027020, FIC027250', '978-1-234567-14-2', 'English', 'Heart & Soul Books', 77],
      ['The Memory Thief', 'What Happens When Memories Disappear', 'Detective Anna Kovacs has perfect memory. The killer she\'s hunting steals specific memories from victims, leaving them alive but hollow. A cerebral mystery like no other.', 'mystery, detective, memory, serial killer, psychological, cerebral, investigation', 'Mystery, Psychological Thriller', 'FIC022020, FIC031010', '978-1-234567-15-9', 'English', 'Enigma Press', 88]
    ];

    for (const m of metadata) {
      await client.query(
        'INSERT INTO metadata_entries (book_title, subtitle, description, keywords, categories, bisac_codes, isbn, language, publisher, seo_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        m
      );
    }
    console.log('Metadata seeded (15)');

    // Seed distribution channels (15 items)
    const distributions = [
      ['The Midnight Garden', 'Amazon KDP', 'E-commerce', 'Global', 'Ebook', 9.99, 'USD', 30, 'https://amazon.com/dp/B001', '2024-01-15', 'Approved'],
      ['Code Breakers', 'Apple Books', 'E-commerce', 'Global', 'Ebook', 11.99, 'USD', 30, 'https://books.apple.com/b002', '2024-02-01', 'Approved'],
      ['Stardust Chronicles', 'Amazon KDP', 'E-commerce', 'Global', 'Paperback', 14.99, 'USD', 40, 'https://amazon.com/dp/B003', '2024-01-20', 'Approved'],
      ['The Baker\'s Daughter', 'Barnes & Noble', 'Retail', 'US', 'Hardcover', 24.99, 'USD', 45, 'https://bn.com/b004', '2024-03-01', 'Approved'],
      ['Digital Nomad', 'Kobo', 'E-commerce', 'Global', 'Ebook', 7.99, 'USD', 30, 'https://kobo.com/b005', '2024-02-15', 'Pending'],
      ['Whispers in the Dark', 'Amazon KDP', 'E-commerce', 'Global', 'Ebook', 8.99, 'USD', 30, 'https://amazon.com/dp/B006', '2024-03-10', 'Approved'],
      ['The Last Algorithm', 'Google Play Books', 'E-commerce', 'Global', 'Ebook', 10.99, 'USD', 35, 'https://play.google.com/b007', '2024-02-20', 'Approved'],
      ['Ocean\'s Memory', 'IngramSpark', 'Distributor', 'Global', 'Paperback', 16.99, 'USD', 55, 'https://ingramspark.com/b008', '2024-03-05', 'Pending'],
      ['Boardroom Wars', 'Audible', 'Audio Platform', 'Global', 'Audiobook', 19.99, 'USD', 60, 'https://audible.com/b009', '2024-01-25', 'Approved'],
      ['The Herbalist\'s Guide', 'Amazon KDP', 'E-commerce', 'Global', 'Ebook', 12.99, 'USD', 30, 'https://amazon.com/dp/B010', '2024-02-10', 'Approved'],
      ['Broken Compass', 'Smashwords', 'E-commerce', 'Global', 'Ebook', 6.99, 'USD', 25, 'https://smashwords.com/b011', '2024-03-15', 'Pending'],
      ['Neon Nights', 'Amazon KDP', 'E-commerce', 'US, UK, JP', 'Paperback', 15.99, 'USD', 40, 'https://amazon.com/dp/B012', '2024-02-28', 'Approved'],
      ['The Quiet Revolution', 'Draft2Digital', 'Distributor', 'Global', 'Ebook', 8.99, 'USD', 15, 'https://draft2digital.com/b013', '2024-03-20', 'Pending'],
      ['Love in Transit', 'Apple Books', 'E-commerce', 'US, UK, FR', 'Ebook', 9.99, 'USD', 30, 'https://books.apple.com/b014', '2024-01-30', 'Approved'],
      ['The Memory Thief', 'Amazon KDP', 'E-commerce', 'Global', 'Ebook + Paperback', 12.99, 'USD', 30, 'https://amazon.com/dp/B015', '2024-02-05', 'Approved']
    ];

    for (const d of distributions) {
      await client.query(
        'INSERT INTO distribution_channels (book_title, channel_name, channel_type, region, format, price, currency, commission_rate, listing_url, submission_date, approval_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        d
      );
    }
    console.log('Distribution channels seeded (15)');

    // Seed royalties (15 items)
    const royalties = [
      ['The Midnight Garden', 'Sarah Mitchell', 'Amazon KDP', 'Q4 2024', 3420, 34166.80, 23916.76, 70, 23916.76, 'USD', 'Paid', '2025-01-15'],
      ['Code Breakers', 'James Chen', 'Apple Books', 'Q4 2024', 2150, 25777.50, 18044.25, 70, 18044.25, 'USD', 'Paid', '2025-01-20'],
      ['Stardust Chronicles', 'Maria Lopez', 'Amazon KDP', 'Q4 2024', 5800, 86942.00, 52165.20, 60, 52165.20, 'USD', 'Paid', '2025-01-15'],
      ['The Baker\'s Daughter', 'Emily Watson', 'Barnes & Noble', 'Q4 2024', 1890, 47227.10, 25974.91, 55, 25974.91, 'USD', 'Processing', '2025-02-01'],
      ['Digital Nomad', 'Alex Rivera', 'Kobo', 'Q4 2024', 780, 6232.20, 4362.54, 70, 4362.54, 'USD', 'Pending', '2025-02-15'],
      ['Whispers in the Dark', 'Rachel Black', 'Amazon KDP', 'Q4 2024', 2950, 26521.50, 18565.05, 70, 18565.05, 'USD', 'Paid', '2025-01-15'],
      ['The Last Algorithm', 'David Kim', 'Google Play', 'Q4 2024', 1620, 17811.80, 11577.67, 65, 11577.67, 'USD', 'Paid', '2025-01-25'],
      ['Ocean\'s Memory', 'Luna Torres', 'IngramSpark', 'Q4 2024', 1340, 22756.60, 10240.47, 45, 10240.47, 'USD', 'Processing', '2025-02-10'],
      ['Boardroom Wars', 'Michael Sterling', 'Audible', 'Q4 2024', 4200, 83958.00, 33583.20, 40, 33583.20, 'USD', 'Paid', '2025-01-20'],
      ['The Herbalist\'s Guide', 'Sage Williams', 'Amazon KDP', 'Q4 2024', 4100, 53258.00, 37280.60, 70, 37280.60, 'USD', 'Paid', '2025-01-15'],
      ['Broken Compass', 'Tom Hayes', 'Smashwords', 'Q4 2024', 920, 6430.80, 4824.10, 75, 4824.10, 'USD', 'Pending', '2025-02-20'],
      ['Neon Nights', 'Yuki Tanaka', 'Amazon KDP', 'Q4 2024', 3300, 52767.00, 31660.20, 60, 31660.20, 'USD', 'Paid', '2025-01-15'],
      ['The Quiet Revolution', 'Amara Okafor', 'Draft2Digital', 'Q4 2024', 650, 5843.50, 4964.98, 85, 4964.98, 'USD', 'Pending', '2025-02-25'],
      ['Love in Transit', 'Sophie Duval', 'Apple Books', 'Q4 2024', 2800, 27972.00, 19580.40, 70, 19580.40, 'USD', 'Paid', '2025-01-20'],
      ['The Memory Thief', 'Oliver Grant', 'Amazon KDP', 'Q4 2024', 6200, 80538.00, 56376.60, 70, 56376.60, 'USD', 'Paid', '2025-01-15']
    ];

    for (const r of royalties) {
      await client.query(
        'INSERT INTO royalties (book_title, author, channel, period, units_sold, gross_revenue, net_revenue, royalty_rate, royalty_amount, currency, payment_status, payment_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        r
      );
    }
    console.log('Royalties seeded (15)');

    // Seed authors (15)
    const authors = [
      ['Sarah Mitchell', 'sarah@mitchell.com', 'Award-winning author of literary fiction exploring themes of memory and identity.', 'https://sarahmitchell.com', '@sarahmitchellwrites', 'Literary Fiction', 5, 142000, 4.3, 'British', 'Jane Harper'],
      ['James Chen', 'james@chenbooks.com', 'Former NSA cryptographer turned thriller writer.', 'https://jameschen.io', '@jchenthriller', 'Thriller', 8, 380000, 4.5, 'American', 'Mark Dawson Agency'],
      ['Maria Lopez', 'maria@lopezscifi.com', 'Astrophysicist and sci-fi author known for hard science fiction.', 'https://marialopez.space', '@marialopezscifi', 'Science Fiction', 12, 890000, 4.7, 'Mexican-American', 'Stella Literary'],
      ['Emily Watson', 'emily@watsonbooks.com', 'Historical fiction author with a PhD in European History.', 'https://emilywatson.co.uk', '@ewatsonhistory', 'Historical Fiction', 6, 210000, 4.2, 'British', 'Penguin Literary'],
      ['Alex Rivera', 'alex@riverawrites.com', 'Digital nomad and satirical fiction writer.', 'https://alexrivera.blog', '@alexriverawrites', 'Contemporary Fiction', 3, 45000, 3.8, 'Spanish', 'Self-represented'],
      ['Rachel Black', 'rachel@blackhorror.com', 'Horror author known for atmospheric gothic fiction.', 'https://rachelblack.dark', '@rachelblackhorror', 'Horror', 9, 520000, 4.4, 'American', 'Dark Matter Agency'],
      ['David Kim', 'david@kimtech.com', 'AI researcher and techno-thriller novelist.', 'https://davidkim.tech', '@dkimwrites', 'Techno-Thriller', 4, 175000, 4.1, 'Korean-American', 'Silicon Literary'],
      ['Luna Torres', 'luna@torresbooks.com', 'Marine biologist whose magical realism draws from ocean science.', 'https://lunatorres.sea', '@lunatorresauthor', 'Magical Realism', 3, 89000, 4.6, 'Brazilian', 'Wave Literary'],
      ['Michael Sterling', 'michael@sterlingfiction.com', 'Former Wall Street executive turned business fiction author.', 'https://michaelsterling.biz', '@msterlingbooks', 'Business Fiction', 7, 310000, 4.0, 'American', 'Capital Literary'],
      ['Sage Williams', 'sage@rootwoodsaga.com', 'Fantasy author creating worlds where magic and nature intertwine.', 'https://sagewilliams.fantasy', '@sagewilliams', 'Fantasy', 4, 420000, 4.8, 'Canadian', 'Enchanted Agency'],
      ['Tom Hayes', 'tom@hayesadventure.com', 'Former adventure guide turned action fiction writer.', 'https://tomhayes.adventure', '@tomhayesbooks', 'Adventure', 6, 155000, 4.1, 'Australian', 'Outback Literary'],
      ['Yuki Tanaka', 'yuki@neonprose.jp', 'Japanese-American cyberpunk author and game designer.', 'https://yukitanaka.cyber', '@yukitanaka', 'Cyberpunk', 5, 280000, 4.5, 'Japanese-American', 'Neon Agency'],
      ['Amara Okafor', 'amara@okaforwrites.com', 'Journalist and political fiction author from Nigeria.', 'https://amaraokafor.com', '@amaraokafor', 'Political Fiction', 3, 67000, 4.3, 'Nigerian', 'Pan-African Literary'],
      ['Sophie Duval', 'sophie@duvalromance.fr', 'French romance novelist known for cross-cultural love stories.', 'https://sophieduval.romance', '@sophieduval', 'Romance', 11, 680000, 4.4, 'French', 'Amour Literary'],
      ['Oliver Grant', 'oliver@grantmystery.com', 'Former forensic psychologist turned mystery writer.', 'https://olivergrant.mystery', '@olivergrant', 'Mystery', 7, 450000, 4.6, 'British', 'Baker Street Agency']
    ];
    for (const a of authors) {
      await client.query('INSERT INTO authors (name,email,bio,website,social_media,genre_specialty,books_published,total_sales,rating,nationality,agent_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', a);
    }
    console.log('Authors seeded (15)');

    // Seed book series (15)
    const series = [
      ['Stardust Chronicles', 'Maria Lopez', 'Science Fiction', 5, 3, '1. First Contact, 2. The Artifact War, 3. Homecoming', 'Epic space opera following Captain Zara Obi across the galaxy.', 'Ongoing', 4.7, 890000, '2025-06-15'],
      ['The Rootwood Saga', 'Sage Williams', 'Fantasy', 4, 2, '1. The Herbalist Guide, 2. Seeds of War', 'A world where magic flows through plants and one herbalist must save it all.', 'Ongoing', 4.8, 420000, '2025-09-01'],
      ['The Memory Files', 'Oliver Grant', 'Mystery', 6, 4, '1. The Memory Thief, 2. Echo Chamber, 3. Mind Palace, 4. Total Recall', 'Detective Anna Kovacs uses her perfect memory to solve impossible cases.', 'Ongoing', 4.6, 450000, '2025-04-20'],
      ['Neo-Tokyo Noir', 'Yuki Tanaka', 'Cyberpunk', 3, 2, '1. Neon Nights, 2. Chrome Dawn', 'Hacker Rei Yamamoto navigates the dark underbelly of future Tokyo.', 'Ongoing', 4.5, 280000, '2025-08-10'],
      ['The Paris Resistance', 'Emily Watson', 'Historical Fiction', 3, 2, '1. The Baker Daughter, 2. Shadows of the Seine', 'Stories of courage in occupied Paris during WWII.', 'Ongoing', 4.2, 210000, '2025-11-15'],
      ['Cipher Series', 'James Chen', 'Thriller', 5, 4, '1. Code Breakers, 2. Zero Day, 3. Dark Web, 4. Quantum Lock', 'Cryptographer Maya Shah battles digital threats to global security.', 'Ongoing', 4.5, 380000, '2025-07-01'],
      ['The Eurostar Romance', 'Sophie Duval', 'Romance', 4, 3, '1. Love in Transit, 2. Station to Station, 3. Last Stop Paris', 'Love stories connected by the train between Paris and London.', 'Ongoing', 4.4, 680000, '2025-05-14'],
      ['Boardroom Trilogy', 'Michael Sterling', 'Business Fiction', 3, 3, '1. Boardroom Wars, 2. Hostile Takeover, 3. Golden Parachute', 'Inside the ruthless world of Silicon Valley power.', 'Completed', 4.0, 310000, null],
      ['Raven Lane Hauntings', 'Rachel Black', 'Horror', 4, 3, '1. Whispers in the Dark, 2. The Watching, 3. Beneath the Floorboards', 'Each book explores a new family in the cursed houses of Raven Lane.', 'Ongoing', 4.4, 520000, '2025-10-31'],
      ['Ocean Worlds', 'Luna Torres', 'Magical Realism', 3, 1, '1. Ocean Memory', 'Marine-themed magical realism exploring ancient oceanic civilizations.', 'Ongoing', 4.6, 89000, '2025-12-01'],
      ['The Explorer Chronicles', 'Tom Hayes', 'Adventure', 4, 3, '1. Broken Compass, 2. Sunken Temple, 3. Frozen Peak', 'Archaeologist Jack Mercer hunts for legendary lost places.', 'Ongoing', 4.1, 155000, '2025-06-20'],
      ['Azania Rising', 'Amara Okafor', 'Political Fiction', 3, 1, '1. The Quiet Revolution', 'Political transformation in a fictional African nation.', 'Ongoing', 4.3, 67000, '2026-01-15'],
      ['Digital Life', 'Alex Rivera', 'Contemporary Fiction', 3, 2, '1. Digital Nomad, 2. Remote Control', 'Satirical fiction about modern tech culture.', 'Ongoing', 3.8, 45000, '2025-08-30'],
      ['The Algorithm Series', 'David Kim', 'Techno-Thriller', 3, 2, '1. The Last Algorithm, 2. Neural Network', 'The ethical dilemmas of artificial intelligence development.', 'Ongoing', 4.1, 175000, '2025-07-15'],
      ['The Midnight Collection', 'Sarah Mitchell', 'Literary Fiction', 3, 2, '1. The Midnight Garden, 2. Dawn Chorus', 'Connected novels exploring memory, loss, and English estates.', 'Ongoing', 4.3, 142000, '2025-09-20']
    ];
    for (const s of series) {
      await client.query('INSERT INTO book_series (series_name,author,genre,total_books,published_books,reading_order,description,status,avg_rating,total_series_sales,next_release_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', s);
    }
    console.log('Book series seeded (15)');

    // Seed marketing campaigns (15)
    const marketing = [
      ['Stardust Launch Blitz', 'Stardust Chronicles', 'Book Launch', 'Amazon Ads', 5000, 4200, '2024-11-01', '2024-12-15', 850000, 12500, 890, 312, 'Active'],
      ['Memory Thief BookTok', 'The Memory Thief', 'Social Media', 'TikTok', 3000, 2800, '2024-10-15', '2024-12-31', 2100000, 45000, 1200, 428, 'Active'],
      ['Holiday Romance Push', 'Love in Transit', 'Seasonal', 'Facebook Ads', 4000, 3500, '2024-12-01', '2024-12-25', 620000, 8900, 670, 191, 'Completed'],
      ['Herbalist Fantasy Promo', 'The Herbalist Guide', 'Genre Promotion', 'BookBub', 2500, 2500, '2024-11-15', '2024-11-16', 450000, 15000, 980, 392, 'Completed'],
      ['Neon Nights Anime Crossover', 'Neon Nights', 'Cross-Promotion', 'Instagram', 3500, 3100, '2024-10-01', '2024-11-30', 780000, 18200, 540, 174, 'Completed'],
      ['Code Breakers Tech Blog Tour', 'Code Breakers', 'Blog Tour', 'Multiple Blogs', 1500, 1500, '2024-09-01', '2024-09-30', 320000, 6800, 420, 280, 'Completed'],
      ['Horror October Campaign', 'Whispers in the Dark', 'Seasonal', 'Amazon + Social', 6000, 5400, '2024-10-01', '2024-10-31', 1200000, 22000, 1500, 278, 'Completed'],
      ['Boardroom LinkedIn Push', 'Boardroom Wars', 'Professional', 'LinkedIn Ads', 2000, 1800, '2024-11-01', '2024-12-15', 180000, 4200, 380, 211, 'Active'],
      ['Ocean Memory Book Club', 'Ocean Memory', 'Book Club', 'Goodreads', 800, 750, '2024-10-15', '2024-12-31', 95000, 3400, 290, 387, 'Active'],
      ['Baker Daughter Historical Promo', 'The Baker Daughter', 'Genre Promotion', 'Amazon Ads', 3000, 2600, '2024-11-11', '2024-12-31', 410000, 7200, 520, 200, 'Active'],
      ['Revolution Newsletter Blast', 'The Quiet Revolution', 'Email Marketing', 'Mailchimp', 500, 500, '2024-12-01', '2024-12-15', 45000, 2800, 180, 360, 'Completed'],
      ['Broken Compass Adventure Promo', 'Broken Compass', 'Genre Promotion', 'BookBub', 2000, 2000, '2024-09-15', '2024-09-16', 380000, 11000, 650, 325, 'Completed'],
      ['Last Algorithm AI Conference', 'The Last Algorithm', 'Event', 'Conference Booth', 4000, 3800, '2024-11-20', '2024-11-22', 50000, 2000, 320, 84, 'Completed'],
      ['Digital Nomad Influencer Collab', 'Digital Nomad', 'Influencer', 'YouTube', 2500, 2200, '2024-10-01', '2024-11-30', 560000, 9500, 280, 127, 'Completed'],
      ['Midnight Garden Awards Push', 'The Midnight Garden', 'Awards Campaign', 'Industry PR', 3500, 3200, '2024-09-01', '2024-12-31', 200000, 5600, 450, 141, 'Active']
    ];
    for (const m of marketing) {
      await client.query('INSERT INTO marketing_campaigns (campaign_name,book_title,campaign_type,platform,budget,spent,start_date,end_date,impressions,clicks,conversions,roi,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', m);
    }
    console.log('Marketing campaigns seeded (15)');

    // Seed reviews (15)
    const reviews = [
      ['The Memory Thief', 'BookLover2024', 'Amazon', 5.0, 'Absolutely brilliant! The concept of a memory-stealing serial killer is terrifyingly original. Detective Kovacs is one of the best protagonists I have read in years.', '2024-12-10', true, 342, 'Very Positive'],
      ['Stardust Chronicles', 'SciFiNerd', 'Goodreads', 4.5, 'Epic world-building and a compelling protagonist. The alien artifact reveal gave me chills. Cannot wait for book 4.', '2024-11-28', true, 218, 'Positive'],
      ['Love in Transit', 'RomanceReader', 'Amazon', 4.0, 'Beautiful prose and a unique structure. The seasonal meetings on the Eurostar felt magical. Lost half a star for the predictable ending.', '2024-12-05', true, 156, 'Positive'],
      ['The Herbalist Guide', 'FantasyFan99', 'Barnes & Noble', 5.0, 'The magic system based on herbalism is the most creative thing I have encountered in fantasy. Sage Williams is a genius.', '2024-11-15', true, 287, 'Very Positive'],
      ['Code Breakers', 'TechReader', 'Apple Books', 3.5, 'Good technical details but the romance subplot felt forced. The quantum computing aspects were well-researched though.', '2024-10-20', true, 89, 'Mixed'],
      ['Whispers in the Dark', 'HorrorQueen', 'Goodreads', 4.5, 'I slept with the lights on for a week. Rachel Black has outdone herself with this sentient house concept.', '2024-11-01', true, 445, 'Very Positive'],
      ['Neon Nights', 'CyberReader', 'Amazon', 4.0, 'Great cyberpunk atmosphere. The neo-Tokyo setting is vivid and immersive. Rei is a fantastic protagonist.', '2024-12-15', true, 198, 'Positive'],
      ['Boardroom Wars', 'BizFicFan', 'Goodreads', 3.0, 'Entertaining but stretches credibility. Some of the corporate scheming felt over the top. Good airport read though.', '2024-10-30', false, 45, 'Neutral'],
      ['The Baker Daughter', 'HistoryBuff', 'Amazon', 4.5, 'Beautifully researched and emotionally devastating. The bakery scenes are so vivid you can smell the bread.', '2024-11-20', true, 312, 'Very Positive'],
      ['Ocean Memory', 'LitFicLover', 'Goodreads', 5.0, 'Magical realism at its finest. Luna Torres writes about the ocean like she was born in it. Hauntingly beautiful.', '2024-12-01', true, 178, 'Very Positive'],
      ['Digital Nomad', 'NomadLife', 'Amazon', 2.5, 'As a digital nomad myself, I found the stereotypes a bit heavy-handed. Some good observations but overall felt like it was punching down.', '2024-10-05', true, 67, 'Negative'],
      ['The Last Algorithm', 'AIEnthusiast', 'Apple Books', 4.0, 'Thought-provoking exploration of AI sentience. The ethical dilemmas felt very real and timely. Recommended for anyone in tech.', '2024-11-10', true, 234, 'Positive'],
      ['Broken Compass', 'AdventureSeeker', 'Amazon', 3.5, 'Fun adventure romp but the villain was one-dimensional. The Amazon setting descriptions were excellent though.', '2024-12-08', true, 92, 'Mixed'],
      ['The Quiet Revolution', 'PoliReader', 'Goodreads', 4.0, 'Important and timely. Amara Okafor brings authenticity to the political landscape. The social media elements feel very real.', '2024-11-25', false, 134, 'Positive'],
      ['The Midnight Garden', 'LiteraryMaven', 'Amazon', 4.5, 'Sarah Mitchell is a master of atmosphere. The decaying estate is practically a character itself. A meditation on loss and memory.', '2024-12-12', true, 267, 'Very Positive']
    ];
    for (const r of reviews) {
      await client.query('INSERT INTO book_reviews (book_title,reviewer_name,platform,rating,review_text,review_date,verified_purchase,helpful_votes,sentiment) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', r);
    }
    console.log('Reviews seeded (15)');

    // Seed print production (15)
    const production = [
      ['The Midnight Garden', 'Hardcover', 10000, 3.50, 35000, 'Lightning Source', 'Cream 60lb', 'Case Bound', 312, '5.5x8.5', 'Completed', '2024-01-10', 'Nashville, TN'],
      ['Code Breakers', 'Paperback', 15000, 2.10, 31500, 'KDP Print', '50lb White', 'Perfect Bound', 348, '5.25x8', 'Completed', '2024-02-15', 'Lexington, KY'],
      ['Stardust Chronicles', 'Hardcover', 25000, 4.20, 105000, 'Ingram Content', 'Cream 70lb', 'Case Bound', 420, '6x9', 'Completed', '2024-01-20', 'La Vergne, TN'],
      ['Stardust Chronicles', 'Paperback', 50000, 1.80, 90000, 'KDP Print', '50lb White', 'Perfect Bound', 420, '5.5x8.5', 'In Production', '2024-03-15', 'Lexington, KY'],
      ['The Baker Daughter', 'Paperback', 12000, 2.30, 27600, 'Lightning Source', '60lb White', 'Perfect Bound', 296, '5.25x8', 'Completed', '2024-03-01', 'Nashville, TN'],
      ['Whispers in the Dark', 'Paperback', 20000, 1.90, 38000, 'KDP Print', '50lb Cream', 'Perfect Bound', 268, '5x8', 'Completed', '2024-03-10', 'Lexington, KY'],
      ['The Last Algorithm', 'Paperback', 18000, 2.00, 36000, 'Lightning Source', '50lb White', 'Perfect Bound', 332, '5.5x8.5', 'Completed', '2024-02-20', 'Nashville, TN'],
      ['The Herbalist Guide', 'Hardcover', 15000, 3.80, 57000, 'Ingram Content', 'Cream 70lb', 'Case Bound', 368, '5.5x8.5', 'Completed', '2024-02-10', 'La Vergne, TN'],
      ['Neon Nights', 'Paperback', 22000, 2.20, 48400, 'KDP Print', '50lb White', 'Perfect Bound', 316, '5.25x8', 'Completed', '2024-02-28', 'Lexington, KY'],
      ['Boardroom Wars', 'Hardcover', 8000, 3.60, 28800, 'Lightning Source', '60lb White', 'Case Bound', 308, '5.5x8.5', 'Completed', '2024-01-25', 'Nashville, TN'],
      ['Love in Transit', 'Paperback', 30000, 1.70, 51000, 'KDP Print', '50lb Cream', 'Perfect Bound', 252, '5x8', 'In Production', '2024-04-01', 'Lexington, KY'],
      ['The Memory Thief', 'Hardcover', 20000, 3.90, 78000, 'Ingram Content', 'Cream 70lb', 'Case Bound', 304, '5.5x8.5', 'Completed', '2024-02-05', 'La Vergne, TN'],
      ['Ocean Memory', 'Paperback', 8000, 2.40, 19200, 'Lightning Source', '60lb Cream', 'Perfect Bound', 276, '5.25x8', 'Planning', '2024-04-15', 'Nashville, TN'],
      ['Broken Compass', 'Paperback', 14000, 2.10, 29400, 'KDP Print', '50lb White', 'Perfect Bound', 344, '5.5x8.5', 'In Production', '2024-03-25', 'Lexington, KY'],
      ['The Quiet Revolution', 'Paperback', 6000, 2.50, 15000, 'Lightning Source', '60lb White', 'Perfect Bound', 298, '5.25x8', 'Planning', '2024-05-01', 'Nashville, TN']
    ];
    for (const p of production) {
      await client.query('INSERT INTO print_production (book_title,format,print_run,unit_cost,total_cost,printer,paper_type,binding_type,page_count,trim_size,status,delivery_date,warehouse_location) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', p);
    }
    console.log('Print production seeded (15)');

    // Seed translations (15)
    const translations = [
      ['Stardust Chronicles', 'English', 'Spanish', 'Carlos Mendez', 'Completed', 110000, 8800, '2024-06-01', '2024-10-01', 9.2, 'Planeta', 'High'],
      ['Stardust Chronicles', 'English', 'Japanese', 'Akiko Yamamoto', 'In Progress', 110000, 12100, '2024-08-01', '2025-02-01', 0, 'Hayakawa', 'Very High'],
      ['The Memory Thief', 'English', 'German', 'Klaus Weber', 'Completed', 81000, 7290, '2024-07-01', '2024-11-01', 8.8, 'Heyne Verlag', 'High'],
      ['Love in Transit', 'English', 'French', 'Marie Beaumont', 'Completed', 68000, 5440, '2024-05-01', '2024-08-01', 9.5, 'Gallimard', 'Very High'],
      ['The Herbalist Guide', 'English', 'Korean', 'Ji-Yeon Park', 'In Progress', 96000, 9600, '2024-09-01', '2025-03-01', 0, 'Munhakdongne', 'Medium'],
      ['Neon Nights', 'English', 'Japanese', 'Taro Suzuki', 'Completed', 84000, 9240, '2024-04-01', '2024-08-01', 9.0, 'Kodansha', 'Very High'],
      ['Code Breakers', 'English', 'Chinese', 'Wei Zhang', 'In Progress', 95000, 7600, '2024-10-01', '2025-04-01', 0, 'CITIC Press', 'High'],
      ['Whispers in the Dark', 'English', 'Italian', 'Lucia Romano', 'Completed', 72000, 5760, '2024-06-15', '2024-10-15', 8.5, 'Mondadori', 'Medium'],
      ['The Baker Daughter', 'English', 'French', 'Pierre Moreau', 'Completed', 78000, 6240, '2024-03-01', '2024-07-01', 9.3, 'Albin Michel', 'High'],
      ['Boardroom Wars', 'English', 'Portuguese', 'Ana Silva', 'In Progress', 82000, 5740, '2024-11-01', '2025-05-01', 0, 'Companhia das Letras', 'Medium'],
      ['The Midnight Garden', 'English', 'Spanish', 'Isabel Reyes', 'Completed', 87000, 6960, '2024-04-15', '2024-08-15', 8.9, 'Salamandra', 'Medium'],
      ['Ocean Memory', 'English', 'Portuguese', 'Rafael Costa', 'Pending', 73000, 5840, '2025-01-01', '2025-06-01', 0, 'Saida de Emergencia', 'High'],
      ['The Last Algorithm', 'English', 'German', 'Thomas Muller', 'In Progress', 88000, 7920, '2024-10-15', '2025-04-15', 0, 'Heyne Verlag', 'High'],
      ['The Quiet Revolution', 'English', 'Swahili', 'Amina Mwangi', 'Pending', 79000, 4740, '2025-02-01', '2025-08-01', 0, 'East African Publishers', 'Medium'],
      ['Digital Nomad', 'English', 'Thai', 'Somchai Jaidee', 'Pending', 65000, 3900, '2025-03-01', '2025-09-01', 0, 'Nanmeebooks', 'Low']
    ];
    for (const t of translations) {
      await client.query('INSERT INTO translations (book_title,original_language,target_language,translator_name,translation_status,word_count,cost,start_date,deadline,quality_score,publisher_local,market_potential) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', t);
    }
    console.log('Translations seeded (15)');

    // Seed preorders (15)
    const preorders = [
      ['Stardust Chronicles: Void Walker', '2025-06-15', '2025-03-01', 4200, 62958, 'Amazon', 14.99, 15000, 8500, 82, 'Active'],
      ['The Rootwood Saga: Ash & Ember', '2025-09-01', '2025-05-15', 2800, 36372, 'Amazon', 12.99, 8000, 5200, 75, 'Active'],
      ['The Memory Files: Deja Vu', '2025-04-20', '2025-01-10', 5100, 66249, 'Multiple', 12.99, 12000, 9800, 88, 'Active'],
      ['Neo-Tokyo: Chrome Dawn', '2025-08-10', '2025-04-01', 1900, 28481, 'Amazon', 14.99, 6000, 3800, 71, 'Active'],
      ['Shadows of the Seine', '2025-11-15', '2025-07-01', 1200, 29988, 'Barnes & Noble', 24.99, 5000, 2100, 58, 'Active'],
      ['Cipher: Quantum Lock', '2025-07-01', '2025-03-15', 3600, 43164, 'Amazon', 11.99, 10000, 6700, 79, 'Active'],
      ['Station to Station', '2025-05-14', '2025-02-01', 3200, 31968, 'Apple Books', 9.99, 7000, 4900, 73, 'Active'],
      ['Raven Lane: The Descent', '2025-10-31', '2025-07-15', 2600, 23374, 'Amazon', 8.99, 8000, 5500, 80, 'Active'],
      ['Ocean Depths', '2025-12-01', '2025-08-01', 800, 10392, 'Amazon', 12.99, 3000, 1200, 45, 'Active'],
      ['Frozen Peak', '2025-06-20', '2025-03-01', 1500, 19485, 'Amazon', 12.99, 4000, 2800, 62, 'Active'],
      ['Azania: The Uprising', '2026-01-15', '2025-09-01', 450, 5396, 'Amazon', 11.99, 2000, 800, 38, 'Active'],
      ['Remote Control', '2025-08-30', '2025-05-01', 600, 5394, 'Kobo', 8.99, 1500, 900, 35, 'Active'],
      ['Neural Network', '2025-07-15', '2025-04-01', 2100, 23079, 'Amazon', 10.99, 5000, 3400, 68, 'Active'],
      ['Dawn Chorus', '2025-09-20', '2025-06-01', 1800, 21582, 'Amazon', 11.99, 4500, 2600, 64, 'Active'],
      ['The Eurostar Diaries', '2025-12-15', '2025-08-15', 2400, 23976, 'Multiple', 9.99, 6000, 3100, 70, 'Active']
    ];
    for (const p of preorders) {
      await client.query('INSERT INTO preorders (book_title,launch_date,preorder_start,preorder_count,preorder_revenue,platform,price,marketing_budget,email_signups,social_buzz_score,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', p);
    }
    console.log('Preorders seeded (15)');

    // Seed competitor books (15)
    const competitors = [
      ['Project Hail Mary', 'Andy Weir', 'Science Fiction', 'Ballantine Books', 14.99, 4.7, 125000, 12, '2021-05-04', 2500000, 'Strong science, humor, universal appeal', 'Narrow sci-fi focus', 'More diverse cast and themes'],
      ['The Maid', 'Nita Prose', 'Mystery', 'Ballantine Books', 16.99, 4.1, 89000, 45, '2022-01-04', 1800000, 'Unique protagonist, cozy mystery appeal', 'Slower pacing', 'Faster-paced thrillers'],
      ['Fourth Wing', 'Rebecca Yarros', 'Fantasy', 'Red Tower Books', 19.99, 4.5, 340000, 3, '2023-05-02', 4200000, 'Romance + fantasy crossover, BookTok viral', 'Predictable romance tropes', 'Deeper magic systems'],
      ['Tomorrow and Tomorrow', 'Gabriella Zevin', 'Literary Fiction', 'Knopf', 14.99, 4.2, 72000, 67, '2022-07-05', 1200000, 'Unique structure, gaming culture', 'Niche audience', 'Broader appeal'],
      ['Lessons in Chemistry', 'Bonnie Garmus', 'Historical Fiction', 'Doubleday', 15.99, 4.4, 198000, 8, '2022-04-05', 3500000, 'Feminist angle, humor, TV adaptation', 'Single perspective', 'Multiple POV richness'],
      ['The House in the Cerulean Sea', 'TJ Klune', 'Fantasy', 'Tor Books', 13.99, 4.7, 156000, 15, '2020-03-17', 2800000, 'Feel-good, inclusive, cozy', 'Low stakes', 'Higher narrative tension'],
      ['Dark Matter', 'Blake Crouch', 'Techno-Thriller', 'Crown', 11.99, 4.3, 95000, 28, '2016-07-26', 2100000, 'Mind-bending concept, fast paced', 'Dated tech references', 'Current AI themes'],
      ['The Silent Patient', 'Alex Michaelides', 'Psychological Thriller', 'Celadon Books', 12.99, 4.0, 210000, 5, '2019-02-05', 5500000, 'Shocking twist, compulsive reading', 'One-dimensional characters', 'Complex character development'],
      ['Circe', 'Madeline Miller', 'Magical Realism', 'Little Brown', 14.99, 4.6, 142000, 22, '2018-04-10', 3200000, 'Literary quality, mythology', 'Slow burn', 'Modern magical elements'],
      ['The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 'Romance', 'Atria Books', 13.99, 4.5, 280000, 4, '2017-06-13', 4800000, 'Compelling narrative, LGBTQ rep', 'Historical setting limits audience', 'Contemporary settings'],
      ['Neuromancer', 'William Gibson', 'Cyberpunk', 'Ace Books', 9.99, 4.0, 45000, 120, '1984-07-01', 6500000, 'Genre-defining classic', 'Dense prose, dated tech', 'Modern accessible cyberpunk'],
      ['The Alchemist', 'Paulo Coelho', 'Philosophical Fiction', 'HarperOne', 12.99, 4.2, 320000, 2, '1988-01-01', 65000000, 'Universal themes, simple prose', 'Simplistic philosophy', 'Complex contemporary themes'],
      ['Where the Crawdads Sing', 'Delia Owens', 'Literary Mystery', 'Putnam', 14.99, 4.5, 425000, 1, '2018-08-14', 12000000, 'Nature writing, dual timeline', 'Controversial author', 'Clean author reputation'],
      ['Anxious People', 'Fredrik Backman', 'Contemporary Fiction', 'Atria Books', 13.99, 4.1, 88000, 55, '2020-09-08', 1500000, 'Humor, warmth, ensemble cast', 'Translation sometimes clunky', 'Original English prose'],
      ['Mexican Gothic', 'Silvia Moreno-Garcia', 'Horror', 'Del Rey', 12.99, 3.9, 67000, 78, '2020-06-30', 900000, 'Cultural richness, atmospheric', 'Slow build', 'Faster horror pacing']
    ];
    for (const c of competitors) {
      await client.query('INSERT INTO competitor_books (title,author,genre,publisher,price,rating,reviews_count,rank,release_date,sales_estimate,strengths,weaknesses,our_advantage) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', c);
    }
    console.log('Competitor books seeded (15)');

    // Seed reader analytics (15)
    const analytics = [
      ['Stardust Chronicles', 'Q4 2024', 45000, 18000, 27000, '6h 42m', 78.5, 'M:48% F:45% NB:7%, Age 25-44: 62%', 'US 42%, UK 18%, Canada 12%, Australia 8%', 'Mobile 52%, Desktop 28%, Tablet 20%', 85.2],
      ['The Memory Thief', 'Q4 2024', 38000, 22000, 16000, '5h 18m', 82.3, 'M:38% F:55% NB:7%, Age 30-50: 58%', 'US 48%, UK 22%, Canada 10%, Germany 6%', 'Mobile 48%, Desktop 32%, Tablet 20%', 88.5],
      ['Love in Transit', 'Q4 2024', 32000, 14000, 18000, '4h 30m', 85.1, 'M:22% F:72% NB:6%, Age 25-40: 65%', 'US 35%, UK 25%, France 15%, Canada 8%', 'Mobile 58%, Desktop 22%, Tablet 20%', 82.0],
      ['The Herbalist Guide', 'Q4 2024', 41000, 20000, 21000, '7h 15m', 76.8, 'M:42% F:52% NB:6%, Age 18-35: 70%', 'US 40%, UK 20%, Canada 10%, Australia 8%', 'Mobile 55%, Desktop 25%, Tablet 20%', 79.5],
      ['Code Breakers', 'Q4 2024', 22000, 8000, 14000, '5h 55m', 71.2, 'M:62% F:32% NB:6%, Age 28-45: 58%', 'US 52%, UK 15%, India 10%, Germany 5%', 'Mobile 45%, Desktop 38%, Tablet 17%', 72.8],
      ['Whispers in the Dark', 'Q4 2024', 28000, 12000, 16000, '4h 45m', 80.5, 'M:35% F:58% NB:7%, Age 22-40: 64%', 'US 45%, UK 20%, Canada 12%, Australia 7%', 'Mobile 50%, Desktop 30%, Tablet 20%', 81.3],
      ['Neon Nights', 'Q4 2024', 25000, 11000, 14000, '5h 30m', 74.2, 'M:58% F:35% NB:7%, Age 20-35: 72%', 'US 38%, Japan 22%, UK 12%, Korea 8%', 'Mobile 60%, Desktop 25%, Tablet 15%', 76.0],
      ['Boardroom Wars', 'Q4 2024', 18000, 6000, 12000, '5h 10m', 68.5, 'M:65% F:30% NB:5%, Age 30-50: 70%', 'US 55%, UK 18%, Singapore 5%, India 5%', 'Mobile 40%, Desktop 42%, Tablet 18%', 70.2],
      ['The Baker Daughter', 'Q4 2024', 20000, 9000, 11000, '5h 25m', 79.8, 'M:28% F:66% NB:6%, Age 35-55: 60%', 'US 38%, UK 25%, France 12%, Canada 8%', 'Mobile 45%, Desktop 32%, Tablet 23%', 77.5],
      ['Ocean Memory', 'Q4 2024', 12000, 7000, 5000, '5h 50m', 84.2, 'M:32% F:62% NB:6%, Age 28-45: 58%', 'US 35%, Brazil 15%, UK 15%, Portugal 8%', 'Mobile 48%, Desktop 30%, Tablet 22%', 83.0],
      ['Digital Nomad', 'Q4 2024', 8000, 3000, 5000, '3h 45m', 62.5, 'M:55% F:40% NB:5%, Age 22-35: 75%', 'US 45%, Thailand 10%, UK 10%, Indonesia 8%', 'Mobile 65%, Desktop 20%, Tablet 15%', 58.2],
      ['The Last Algorithm', 'Q4 2024', 16000, 7000, 9000, '5h 40m', 73.5, 'M:60% F:34% NB:6%, Age 25-42: 65%', 'US 48%, UK 15%, India 12%, Germany 5%', 'Mobile 42%, Desktop 40%, Tablet 18%', 74.8],
      ['Broken Compass', 'Q4 2024', 14000, 6000, 8000, '5h 15m', 70.8, 'M:58% F:36% NB:6%, Age 25-45: 62%', 'US 42%, UK 18%, Australia 12%, Canada 8%', 'Mobile 50%, Desktop 30%, Tablet 20%', 68.5],
      ['The Quiet Revolution', 'Q4 2024', 7000, 4000, 3000, '4h 55m', 77.3, 'M:42% F:50% NB:8%, Age 22-40: 68%', 'US 30%, Nigeria 20%, UK 15%, Kenya 10%', 'Mobile 62%, Desktop 22%, Tablet 16%', 71.0],
      ['The Midnight Garden', 'Q4 2024', 15000, 5000, 10000, '6h 10m', 81.0, 'M:30% F:64% NB:6%, Age 35-55: 58%', 'US 40%, UK 28%, Canada 10%, Ireland 5%', 'Mobile 42%, Desktop 35%, Tablet 23%', 80.5]
    ];
    for (const a of analytics) {
      await client.query('INSERT INTO reader_analytics (book_title,period,total_readers,new_readers,returning_readers,avg_reading_time,completion_rate,demographic_data,top_regions,device_breakdown,engagement_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', a);
    }
    console.log('Reader analytics seeded (15)');

    // Seed contracts (15)
    const contracts = [
      ['Stardust Chronicles 5-Book Deal', 'Maria Lopez', 'Stardust Chronicles', 'Multi-Book Deal', 250000, 15, 'World English', 'Print, Digital, Audio', '2023-01-01', '2028-12-31', 'First refusal on next 2 books', 'Active'],
      ['Memory Thief Series Rights', 'Oliver Grant', 'The Memory Thief', 'Series Deal', 150000, 12, 'North America', 'Print, Digital', '2023-06-01', '2027-05-31', 'Option on 3 more books', 'Active'],
      ['Love in Transit Film Option', 'Sophie Duval', 'Love in Transit', 'Film/TV Option', 75000, 5, 'Worldwide', 'Film/TV Adaptation', '2024-03-01', '2026-02-28', 'Extension clause if greenlit', 'Active'],
      ['Herbalist Guide Trilogy', 'Sage Williams', 'The Herbalist Guide', 'Multi-Book Deal', 180000, 14, 'World English', 'Print, Digital, Audio', '2023-09-01', '2027-08-31', 'Option on sequel series', 'Active'],
      ['Code Breakers Audio Rights', 'James Chen', 'Code Breakers', 'Audio Rights', 35000, 25, 'Global', 'Audiobook Only', '2024-01-01', '2029-12-31', 'None', 'Active'],
      ['Neon Nights Manga Adaptation', 'Yuki Tanaka', 'Neon Nights', 'Adaptation Rights', 50000, 8, 'Japan & Global', 'Manga/Comic Adaptation', '2024-06-01', '2027-05-31', 'Co-approval on artist', 'Active'],
      ['Whispers Horror Bundle', 'Rachel Black', 'Whispers in the Dark', 'Multi-Book Deal', 120000, 12, 'World English', 'Print, Digital', '2023-04-01', '2026-03-31', 'First refusal on horror titles', 'Active'],
      ['Baker Daughter Translation Bundle', 'Emily Watson', 'The Baker Daughter', 'Translation Rights', 45000, 10, 'Non-English Markets', 'Translation Rights', '2024-02-01', '2029-01-31', 'Territory by territory approval', 'Active'],
      ['Boardroom Wars Complete', 'Michael Sterling', 'Boardroom Wars', 'Standard Deal', 80000, 10, 'North America', 'Print, Digital', '2022-06-01', '2025-05-31', 'None', 'Expiring'],
      ['Ocean Memory Debut Deal', 'Luna Torres', 'Ocean Memory', 'Debut Author Deal', 40000, 10, 'North America', 'Print, Digital', '2024-01-01', '2028-12-31', 'Option on next 2 books', 'Active'],
      ['Broken Compass Adventure Series', 'Tom Hayes', 'Broken Compass', 'Multi-Book Deal', 95000, 12, 'World English', 'Print, Digital, Audio', '2023-03-01', '2027-02-28', 'First refusal on adventure titles', 'Active'],
      ['Quiet Revolution Publishing Deal', 'Amara Okafor', 'The Quiet Revolution', 'Standard Deal', 55000, 10, 'World English', 'Print, Digital', '2024-05-01', '2028-04-30', 'Option on sequel', 'Active'],
      ['Digital Nomad Self-Pub License', 'Alex Rivera', 'Digital Nomad', 'Self-Publishing', 0, 70, 'Global', 'All Digital Rights', '2024-01-01', '2099-12-31', 'Author retains all rights', 'Active'],
      ['Last Algorithm Tech Rights', 'David Kim', 'The Last Algorithm', 'Standard Deal', 65000, 12, 'North America', 'Print, Digital', '2023-08-01', '2027-07-31', 'Option on AI-themed books', 'Active'],
      ['Midnight Garden Literary Prize Edition', 'Sarah Mitchell', 'The Midnight Garden', 'Special Edition', 25000, 15, 'UK & Commonwealth', 'Special Print Edition', '2024-10-01', '2025-09-30', 'One-year term', 'Active']
    ];
    for (const c of contracts) {
      await client.query('INSERT INTO contracts (contract_title,author_name,book_title,contract_type,advance_amount,royalty_rate,territory,rights_granted,start_date,end_date,option_clause,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', c);
    }
    console.log('Contracts seeded (15)');

    // Seed inventory (15 items)
    const inventoryItems = [
      ['The Midnight Garden', 'Hardcover', 'Warehouse A - Shelf 3', 2500, 150, 200, 1000, 4.50, 'BookPrint Co', '2026-02-15', 'In Stock'],
      ['Code Breakers', 'Paperback', 'Warehouse A - Shelf 7', 4200, 300, 500, 2000, 2.80, 'QuickPress Ltd', '2026-03-01', 'In Stock'],
      ['Stardust Chronicles', 'Hardcover', 'Warehouse B - Shelf 1', 8500, 1200, 500, 3000, 5.20, 'BookPrint Co', '2026-02-20', 'In Stock'],
      ['The Baker\'s Daughter', 'Paperback', 'Warehouse A - Shelf 12', 180, 50, 200, 1000, 2.50, 'EcoPrint Press', '2025-12-10', 'Low Stock'],
      ['Digital Nomad', 'Paperback', 'Warehouse C - Shelf 4', 3100, 0, 300, 1500, 2.20, 'QuickPress Ltd', '2026-01-25', 'In Stock'],
      ['Whispers in the Dark', 'Hardcover', 'Warehouse B - Shelf 8', 950, 200, 300, 1000, 4.80, 'DarkHorse Print', '2026-01-15', 'In Stock'],
      ['The Last Algorithm', 'Paperback', 'Warehouse A - Shelf 5', 6200, 800, 500, 2500, 3.10, 'BookPrint Co', '2026-03-05', 'In Stock'],
      ['Ocean\'s Memory', 'Hardcover', 'Warehouse B - Shelf 3', 75, 30, 200, 1000, 5.50, 'AquaPrint Ltd', '2025-11-20', 'Low Stock'],
      ['Boardroom Wars', 'Paperback', 'Warehouse A - Shelf 9', 3800, 250, 300, 1500, 2.90, 'QuickPress Ltd', '2026-02-28', 'In Stock'],
      ['The Herbalist\'s Guide', 'Hardcover', 'Warehouse B - Shelf 6', 5100, 600, 400, 2000, 5.00, 'GreenLeaf Print', '2026-03-10', 'In Stock'],
      ['Broken Compass', 'Mass Market', 'Warehouse C - Shelf 2', 0, 0, 500, 2000, 1.80, 'MassPrint Inc', '2025-10-01', 'Out of Stock'],
      ['Neon Nights', 'Paperback', 'Warehouse A - Shelf 14', 4500, 350, 400, 2000, 2.60, 'NeonPress Co', '2026-02-10', 'In Stock'],
      ['The Quiet Revolution', 'Paperback', 'Warehouse C - Shelf 7', 1200, 100, 200, 1000, 2.40, 'EcoPrint Press', '2026-01-30', 'In Stock'],
      ['Love in Transit', 'Mass Market', 'Warehouse C - Shelf 1', 7200, 500, 600, 3000, 1.50, 'MassPrint Inc', '2026-03-12', 'In Stock'],
      ['The Memory Thief', 'Hardcover', 'Warehouse B - Shelf 10', 150, 80, 200, 1000, 4.90, 'BookPrint Co', '2025-12-20', 'Reorder Placed']
    ];
    for (const inv of inventoryItems) {
      await client.query('INSERT INTO inventory (book_title,format,warehouse_location,quantity_on_hand,quantity_reserved,reorder_level,reorder_quantity,unit_cost,supplier,last_restock_date,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', inv);
    }
    console.log('Inventory seeded (15)');

    // Seed events (15 items)
    const eventItems = [
      ['Midnight Garden Launch Party', 'Book Launch', 'The Midnight Garden', 'Sarah Mitchell', 'The Ritz London', 'London', '2026-04-15', '18:00', '22:00', 200, 0, 8500, 0, 0, 'Exclusive launch event with champagne reception and author reading', 'Planned'],
      ['Code Breakers Signing Tour - NYC', 'Book Signing', 'Code Breakers', 'James Chen', 'Barnes & Noble Union Square', 'New York', '2026-03-28', '14:00', '17:00', 150, 0, 2000, 0, 0, 'Author signing with Q&A session', 'Planned'],
      ['Stardust Chronicles Fan Convention', 'Conference', 'Stardust Chronicles', 'Maria Lopez', 'San Diego Convention Center', 'San Diego', '2026-05-20', '09:00', '18:00', 5000, 0, 45000, 35.00, 3200, 'Major sci-fi convention panel and signing booth', 'Planned'],
      ['Baker\'s Daughter Historical Fiction Panel', 'Conference', 'The Baker\'s Daughter', 'Emily Watson', 'National Book Festival', 'Washington DC', '2026-06-10', '10:00', '12:00', 300, 0, 1500, 0, 0, 'Panel discussion on historical fiction research methods', 'Planned'],
      ['Digital Nomad Workshop', 'Workshop', 'Digital Nomad', 'Alex Rivera', 'WeWork Soho', 'London', '2026-04-05', '10:00', '16:00', 50, 0, 3000, 45.00, 42, 'Interactive writing workshop for aspiring digital nomad authors', 'Planned'],
      ['Horror Night Reading', 'Reading', 'Whispers in the Dark', 'Rachel Black', 'The Crypt Gallery', 'London', '2026-10-30', '20:00', '23:00', 100, 0, 4000, 15.00, 0, 'Atmospheric Halloween reading in underground venue', 'Planned'],
      ['Tech & Fiction Summit', 'Conference', 'The Last Algorithm', 'David Kim', 'Moscone Center', 'San Francisco', '2026-05-08', '09:00', '17:00', 800, 0, 12000, 50.00, 650, 'AI and fiction crossover summit with tech industry leaders', 'Planned'],
      ['Ocean\'s Memory Beach Reading', 'Reading', 'Ocean\'s Memory', 'Luna Torres', 'Santa Monica Pier', 'Los Angeles', '2026-07-15', '17:00', '20:00', 200, 0, 3500, 0, 0, 'Sunset beach reading with marine conservation fundraiser', 'Planned'],
      ['Business Book Awards Gala', 'Festival', 'Boardroom Wars', 'Michael Sterling', 'The Plaza Hotel', 'New York', '2026-09-18', '19:00', '23:00', 400, 0, 25000, 150.00, 320, 'Annual business fiction awards ceremony', 'Planned'],
      ['Fantasy Book Fair', 'Festival', 'The Herbalist\'s Guide', 'Sage Williams', 'Alexandra Palace', 'London', '2026-08-22', '10:00', '18:00', 3000, 0, 8000, 20.00, 2100, 'Major fantasy book fair with cosplay and signing', 'Planned'],
      ['Adventure Writing Masterclass', 'Workshop', 'Broken Compass', 'Tom Hayes', 'Royal Geographical Society', 'London', '2026-04-28', '09:00', '17:00', 40, 38, 2500, 75.00, 38, 'Full-day adventure writing masterclass', 'Completed'],
      ['Cyberpunk Night Tokyo', 'Book Launch', 'Neon Nights', 'Yuki Tanaka', 'Shibuya Crossing Books', 'Tokyo', '2026-06-01', '20:00', '23:00', 250, 230, 15000, 0, 0, 'Neon-themed launch party in Shibuya', 'Completed'],
      ['Political Fiction Forum', 'Conference', 'The Quiet Revolution', 'Amara Okafor', 'Hay Festival', 'Hay-on-Wye', '2026-05-30', '14:00', '16:00', 500, 0, 2000, 0, 0, 'Panel on political fiction and social change', 'Planned'],
      ['Romance Readers Convention', 'Festival', 'Love in Transit', 'Sophie Duval', 'Paris Expo', 'Paris', '2026-09-05', '10:00', '18:00', 2000, 0, 10000, 25.00, 1500, 'Annual romance readers gathering with author meet-and-greet', 'Planned'],
      ['Mystery Writers Guild Evening', 'Reading', 'The Memory Thief', 'Oliver Grant', 'The London Library', 'London', '2026-04-10', '19:00', '21:00', 120, 115, 1800, 10.00, 115, 'Exclusive mystery reading and discussion evening', 'Completed']
    ];
    for (const ev of eventItems) {
      await client.query('INSERT INTO events (event_name,event_type,book_title,author_name,venue,city,event_date,start_time,end_time,expected_attendance,actual_attendance,budget,ticket_price,tickets_sold,description,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)', ev);
    }
    console.log('Events seeded (15)');

    // Seed expenses (15 items)
    const expenseItems = [
      ['The Midnight Garden', 'Production', 'Hardcover print run - 5000 copies', 22500.00, 'BookPrint Co', '2026-02-10', 'Bank Transfer', 'INV-2026-001', 'Sarah Johnson', 'Operating', false, null, 'Paid'],
      ['Code Breakers', 'Editorial', 'Developmental editing', 4500.00, 'EditPro Services', '2026-01-15', 'Bank Transfer', 'INV-2026-002', 'Mark Davis', 'Operating', false, null, 'Approved'],
      ['Stardust Chronicles', 'Design', 'Cover illustration and design', 3200.00, 'ArtVision Studio', '2026-01-28', 'Credit Card', 'INV-2026-003', 'Sarah Johnson', 'Operating', false, null, 'Paid'],
      ['The Baker\'s Daughter', 'Marketing', 'Facebook and Instagram ad campaign', 8000.00, 'Meta Ads', '2026-02-01', 'Credit Card', 'INV-2026-004', 'Lisa Chen', 'Marketing', false, null, 'Approved'],
      ['Digital Nomad', 'Distribution', 'Amazon listing fees and setup', 1500.00, 'Amazon KDP', '2026-01-20', 'Bank Transfer', 'INV-2026-005', 'Mark Davis', 'Operating', false, null, 'Paid'],
      [null, 'Office', 'Monthly office rent', 4200.00, 'Workspace Ltd', '2026-03-01', 'Bank Transfer', 'INV-2026-006', 'Sarah Johnson', 'Operating', true, 'Monthly', 'Paid'],
      ['Whispers in the Dark', 'Marketing', 'Book trailer video production', 6500.00, 'CineBooks Productions', '2026-02-15', 'Wire Transfer', 'INV-2026-007', 'Lisa Chen', 'Marketing', false, null, 'Pending'],
      ['The Last Algorithm', 'Legal', 'Copyright registration and IP review', 2800.00, 'LitLaw Partners', '2026-01-10', 'Bank Transfer', 'INV-2026-008', 'Sarah Johnson', 'Operating', false, null, 'Paid'],
      [null, 'Office', 'Software subscriptions (Adobe, Slack, etc.)', 850.00, 'Various', '2026-03-01', 'Credit Card', 'INV-2026-009', 'Mark Davis', 'Operating', true, 'Monthly', 'Approved'],
      ['Ocean\'s Memory', 'Production', 'Special edition embossed cover', 5800.00, 'LuxPrint Co', '2026-02-20', 'Wire Transfer', 'INV-2026-010', 'Sarah Johnson', 'Capital', false, null, 'Pending'],
      ['Boardroom Wars', 'Travel', 'Author tour - flights and hotels', 7200.00, 'TravelCorp Agency', '2026-03-05', 'Credit Card', 'INV-2026-011', 'Lisa Chen', 'Marketing', false, null, 'Approved'],
      ['The Herbalist\'s Guide', 'Design', 'Interior illustrations (32 botanical)', 9600.00, 'NatureArt Studio', '2026-01-05', 'Bank Transfer', 'INV-2026-012', 'Sarah Johnson', 'Operating', false, null, 'Paid'],
      [null, 'Office', 'Warehouse storage fees', 3200.00, 'SecureStore Inc', '2026-03-01', 'Bank Transfer', 'INV-2026-013', 'Mark Davis', 'Operating', true, 'Monthly', 'Paid'],
      ['Love in Transit', 'Marketing', 'BookTok influencer campaign', 5500.00, 'InfluenceBooks Agency', '2026-02-25', 'Wire Transfer', 'INV-2026-014', 'Lisa Chen', 'Marketing', false, null, 'Pending'],
      ['The Memory Thief', 'Editorial', 'Copyediting and proofreading', 3800.00, 'PrecisionEdit Ltd', '2026-03-10', 'Bank Transfer', 'INV-2026-015', 'Mark Davis', 'Operating', false, null, 'Pending']
    ];
    for (const exp of expenseItems) {
      await client.query('INSERT INTO expenses (book_title,category,description,amount,vendor,expense_date,payment_method,receipt_number,approved_by,budget_category,is_recurring,recurring_frequency,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', exp);
    }
    console.log('Expenses seeded (15)');

    // Seed tasks (15 items)
    const taskItems = [
      ['Final proofread review', 'The Midnight Garden', 'Emma Clarke', 'Editorial', 'High', 'Complete final proofread before print submission', '2026-03-25', 16, 12, 'Copyedit complete', 'In Progress'],
      ['Design back cover copy', 'Code Breakers', 'Tom Richards', 'Design', 'Medium', 'Write compelling back cover blurb and author bio', '2026-04-01', 4, 0, null, 'To Do'],
      ['Submit to award committees', 'Stardust Chronicles', 'Lisa Chen', 'Marketing', 'High', 'Submit for Hugo, Nebula, and Clarke awards', '2026-03-30', 8, 6, 'Published reviews received', 'In Progress'],
      ['Negotiate audiobook rights', 'The Baker\'s Daughter', 'Sarah Johnson', 'Legal', 'Critical', 'Finalize audiobook deal with Audible', '2026-03-20', 10, 8, 'Contract draft received', 'In Progress'],
      ['Update Amazon keywords', 'Digital Nomad', 'Mark Davis', 'Marketing', 'Low', 'Refresh keywords based on recent search trends', '2026-04-15', 2, 0, null, 'To Do'],
      ['Arrange author photoshoot', 'Whispers in the Dark', 'Amy Foster', 'Marketing', 'Medium', 'Dark themed author photo for press kit', '2026-04-10', 6, 0, 'Cover design finalized', 'To Do'],
      ['Beta reader feedback compilation', 'The Last Algorithm', 'Emma Clarke', 'Editorial', 'High', 'Compile and summarize feedback from 20 beta readers', '2026-03-18', 12, 12, null, 'Done'],
      ['Set up pre-order page', 'Ocean\'s Memory', 'Mark Davis', 'Distribution', 'Critical', 'Create pre-order listings on all platforms', '2026-03-15', 4, 4, 'Cover and blurb approved', 'Done'],
      ['Coordinate book tour logistics', 'Boardroom Wars', 'Lisa Chen', 'Marketing', 'High', 'Book 5-city author tour: hotels, flights, venues', '2026-04-20', 24, 8, 'Tour dates confirmed', 'In Progress'],
      ['Interior layout and typesetting', 'The Herbalist\'s Guide', 'Tom Richards', 'Design', 'Critical', 'Complex layout with 32 botanical illustrations', '2026-03-22', 40, 35, 'Illustrations delivered', 'In Progress'],
      ['Secure foreign rights agent', 'Broken Compass', 'Sarah Johnson', 'Legal', 'Medium', 'Find agent for French and German translation rights', '2026-05-01', 8, 0, null, 'To Do'],
      ['Social media launch campaign', 'Neon Nights', 'Amy Foster', 'Marketing', 'High', 'Plan 4-week social media countdown campaign', '2026-05-01', 16, 0, 'Launch date set', 'To Do'],
      ['Review printer proofs', 'The Quiet Revolution', 'Emma Clarke', 'Production', 'Critical', 'Check color accuracy and binding quality of printer proofs', '2026-03-19', 6, 6, 'Proofs received', 'Done'],
      ['Write discussion guide', 'Love in Transit', 'Tom Richards', 'Editorial', 'Low', 'Create book club discussion guide with 15 questions', '2026-04-30', 4, 0, null, 'To Do'],
      ['Index creation', 'The Memory Thief', 'Emma Clarke', 'Editorial', 'Medium', 'Create comprehensive index for mystery references', '2026-04-05', 20, 5, 'Final manuscript locked', 'In Progress']
    ];
    for (const task of taskItems) {
      await client.query('INSERT INTO publishing_tasks (task_title,book_title,assigned_to,category,priority,description,due_date,estimated_hours,actual_hours,dependencies,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', task);
    }
    console.log('Tasks seeded (15)');

    console.log('\\nSeeding complete! All 15 items per feature (19 features) seeded.');
    console.log('Demo login users provisioned from the local environment.');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
