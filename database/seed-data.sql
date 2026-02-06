-- EUONGELION Seed Data
-- Sample data structure for development and testing
-- Run this after all migrations have been applied

-- =============================================================================
-- Series
-- =============================================================================

INSERT INTO public.series (id, name, slug, description, short_description, duration_days, difficulty_level, tags, is_premium, is_published, is_featured, sort_order, author) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Finding Your Identity in Christ',
    'identity-in-christ',
    'A 7-day journey to discover who you truly are in Christ. This series explores the foundational truths of your identity as a child of God, helping you break free from worldly labels and embrace your eternal purpose.',
    'Discover who you truly are in Christ through 7 transformative devotionals.',
    7,
    'beginner',
    ARRAY['identity', 'foundation', 'new believers', 'purpose'],
    FALSE,
    TRUE,
    TRUE,
    1,
    'EUONGELION Team'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'The Power of Daily Prayer',
    'power-of-prayer',
    'Learn to develop a consistent and powerful prayer life over 14 days. From the basics of conversation with God to intercession and spiritual warfare, this series will transform your relationship with the Father.',
    'Transform your prayer life with practical guidance and spiritual insights.',
    14,
    'intermediate',
    ARRAY['prayer', 'spiritual disciplines', 'intimacy with God'],
    FALSE,
    TRUE,
    FALSE,
    2,
    'EUONGELION Team'
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Walking Through Trials',
    'walking-through-trials',
    'When life gets hard, where do you turn? This 10-day series helps you navigate difficult seasons with faith, hope, and the promises of Scripture. Learn to find God''s presence and purpose in your pain.',
    'Find hope and strength when walking through life''s most difficult seasons.',
    10,
    'intermediate',
    ARRAY['suffering', 'hope', 'trials', 'perseverance'],
    TRUE,
    TRUE,
    FALSE,
    3,
    'EUONGELION Team'
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'Foundations of Faith',
    'foundations-of-faith',
    'Perfect for new believers or those wanting to revisit the basics. This 21-day journey covers the essential doctrines of Christianity, from salvation to sanctification, building a solid foundation for lifelong faith.',
    'Build a solid foundation for lifelong faith with essential Christian doctrines.',
    21,
    'beginner',
    ARRAY['basics', 'doctrine', 'new believers', 'foundation'],
    FALSE,
    TRUE,
    TRUE,
    4,
    'EUONGELION Team'
);

-- =============================================================================
-- Devotionals (Sample entries for "Finding Your Identity in Christ" series)
-- =============================================================================

INSERT INTO public.devotionals (id, series_id, title, slug, subtitle, content, scripture_ref, scripture_text, scripture_version, day_number, reading_time_minutes, prayer, reflection_questions, action_step, is_premium, is_published, author, published_at) VALUES
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'You Are Chosen',
    'you-are-chosen',
    'Understanding God''s intentional love for you',
    E'Before the foundation of the world, God knew you. He didn''t just know about you—He knew you intimately, personally, completely. And in that knowing, He chose you.\n\nIn a world that often makes us feel like an afterthought, this truth is revolutionary. You are not an accident. You are not a cosmic mistake. You are chosen.\n\nThe apostle Paul writes that God "chose us in him before the foundation of the world." Think about the magnitude of that statement. Before time began, before stars were flung into space, before the first breath of creation—you were on God''s mind. You were in His heart.\n\nThis choosing wasn''t based on your performance, your potential, or your pedigree. God didn''t look down the corridors of time, see how good you would be, and then decide you were worth choosing. No—He chose you knowing every failure, every weakness, every dark moment. And He chose you anyway.\n\nThis is the foundation of your identity: You are chosen by the God of the universe, not because of who you are, but because of who He is. His love chose you. His grace claimed you. His purpose defines you.\n\nToday, let this truth sink deep into your soul. Whatever labels the world has placed on you, whatever names you''ve called yourself in moments of doubt—they pale in comparison to this one eternal truth: You are chosen.',
    'Ephesians 1:4',
    'Even as he chose us in him before the foundation of the world, that we should be holy and blameless before him.',
    'ESV',
    1,
    5,
    'Heavenly Father, thank You for choosing me before I ever did anything to deserve it. Help me to live today in the security of being Your chosen child. When doubt creeps in, remind me that Your choice of me was made in eternity and sealed in love. In Jesus'' name, Amen.',
    ARRAY[
        'What labels have you allowed to define your identity?',
        'How does knowing you were chosen before creation change how you see yourself?',
        'What would change in your daily life if you truly believed you are chosen by God?'
    ],
    'Write "I am chosen" on a sticky note and place it somewhere you''ll see it multiple times today. Each time you see it, take a moment to thank God for choosing you.',
    FALSE,
    TRUE,
    'EUONGELION Team',
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'You Are Forgiven',
    'you-are-forgiven',
    'The freedom of complete forgiveness',
    E'The weight of guilt is crushing. It follows us like a shadow, whispering reminders of our failures, our sins, our shortcomings. But today, we''re going to let God''s Word speak louder than those whispers.\n\nYou are forgiven.\n\nNot partially forgiven. Not conditionally forgiven. Not forgiven-as-long-as-you-don''t-mess-up-again forgiven. Completely, totally, eternally forgiven.\n\nThe psalmist paints a beautiful picture of this forgiveness: "As far as the east is from the west, so far does he remove our transgressions from us." Consider the geography of that statement. East and west never meet. They go on forever in opposite directions. That''s how far God has removed your sins from you—infinitely far, never to return.\n\nWhen Jesus cried "It is finished" on the cross, He wasn''t just ending His earthly suffering. He was declaring that the debt of your sin was paid in full. Every past sin, every present struggle, every future failure—covered by His blood.\n\nThe enemy wants you to live in the prison of past guilt. But Jesus has already unlocked the door. You are free. The key is accepting this forgiveness—not just as a theological concept, but as a lived reality.\n\nToday, stop rehearsing your failures. Stop replaying your regrets. Instead, rehearse this truth: You are forgiven. Live like it.',
    'Psalm 103:12',
    'As far as the east is from the west, so far does he remove our transgressions from us.',
    'ESV',
    2,
    6,
    'Lord Jesus, thank You for paying the price I could never pay. I receive Your complete forgiveness today. Help me to forgive myself as You have forgiven me, and to walk in the freedom You died to give me. Amen.',
    ARRAY[
        'Is there a specific sin or failure you''ve been struggling to let go of?',
        'What does it mean to you that God removes your sins "as far as the east is from the west"?',
        'How might your life look different if you fully embraced God''s forgiveness?'
    ],
    'Write down one thing you''ve been holding against yourself. Then, in an act of faith, cross it out and write "FORGIVEN" over it. Keep this as a reminder of God''s complete forgiveness.',
    FALSE,
    TRUE,
    'EUONGELION Team',
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'You Are a New Creation',
    'you-are-new-creation',
    'The old has gone, the new has come',
    E'Caterpillars don''t become better caterpillars. They become butterflies. Something fundamentally changes in their nature. They don''t just get wings—they become an entirely new creature.\n\nThis is what happened to you when you came to Christ. You didn''t just get a spiritual makeover or a moral tune-up. You became a new creation. The old you—the one defined by sin, shame, and separation from God—that person is gone. Dead. Buried with Christ.\n\nAnd in its place? Something entirely new has emerged.\n\nPaul puts it simply: "If anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come." Notice he doesn''t say you''re becoming a new creation or that you will be a new creation someday. You ARE a new creation. Right now. Today. It''s already done.\n\nThis doesn''t mean you''ll never struggle with old patterns or habits. But it does mean those patterns and habits no longer define you. They''re remnants of a dead life, not reflections of your true identity.\n\nYou are not a sinner trying to become a saint. You are a saint who sometimes still sins. There''s a world of difference between those two identities.\n\nToday, embrace the newness that is already yours. You are not who you used to be. You are who God says you are—a brand new creation, with a brand new nature, destined for a brand new eternity.',
    '2 Corinthians 5:17',
    'Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come.',
    'ESV',
    3,
    5,
    'Father, thank You for making me new. I am not who I used to be—I am who You say I am. Help me to live from this new identity, not striving to become something I already am, but walking in the reality of my new creation. In Jesus'' name, Amen.',
    ARRAY[
        'What aspects of your "old self" do you sometimes still identify with?',
        'How does being a "new creation" differ from just being a better version of your old self?',
        'What would it look like to live today as the new creation you already are?'
    ],
    'Identify one area of your life where you''ve been acting from your old identity. Make one specific choice today that reflects your new identity in Christ.',
    FALSE,
    TRUE,
    'EUONGELION Team',
    NOW()
);

-- =============================================================================
-- Soul Audit Questions
-- =============================================================================

INSERT INTO public.soul_audit_questions (id, question_text, question_description, category, question_type, min_value, max_value, min_label, max_label, weight, sort_order, is_required, is_active, scripture_reference) VALUES
-- Faith Foundation
(
    '770e8400-e29b-41d4-a716-446655440001',
    'I have a clear understanding of who God is and His character.',
    'This question explores your intellectual and experiential knowledge of God.',
    'faith_foundation',
    'scale',
    1, 10,
    'Not at all', 'Completely',
    1.0, 1, TRUE, TRUE,
    'Jeremiah 9:23-24'
),
(
    '770e8400-e29b-41d4-a716-446655440002',
    'I am confident in my salvation and relationship with Jesus Christ.',
    'Assurance of salvation is foundational to spiritual growth.',
    'faith_foundation',
    'scale',
    1, 10,
    'Very uncertain', 'Completely assured',
    1.2, 2, TRUE, TRUE,
    '1 John 5:13'
),
(
    '770e8400-e29b-41d4-a716-446655440003',
    'I regularly experience God''s presence in my daily life.',
    'Awareness of God''s presence throughout the day.',
    'faith_foundation',
    'scale',
    1, 10,
    'Rarely', 'Constantly',
    1.0, 3, TRUE, TRUE,
    'Psalm 16:11'
),

-- Prayer Life
(
    '770e8400-e29b-41d4-a716-446655440004',
    'How often do you spend dedicated time in prayer?',
    'Regular, intentional prayer time with God.',
    'prayer_life',
    'frequency',
    1, 10,
    'Rarely', 'Multiple times daily',
    1.0, 4, TRUE, TRUE,
    '1 Thessalonians 5:17'
),
(
    '770e8400-e29b-41d4-a716-446655440005',
    'I feel comfortable talking to God about anything.',
    'Openness and authenticity in your prayer life.',
    'prayer_life',
    'scale',
    1, 10,
    'Very uncomfortable', 'Completely comfortable',
    1.0, 5, TRUE, TRUE,
    'Hebrews 4:16'
),
(
    '770e8400-e29b-41d4-a716-446655440006',
    'I regularly pray for others beyond my immediate needs.',
    'Intercessory prayer and kingdom-focused prayer.',
    'prayer_life',
    'scale',
    1, 10,
    'Rarely', 'Very regularly',
    0.8, 6, TRUE, TRUE,
    'Ephesians 6:18'
),

-- Scripture Engagement
(
    '770e8400-e29b-41d4-a716-446655440007',
    'How often do you read or study the Bible?',
    'Regular engagement with God''s Word.',
    'scripture_engagement',
    'frequency',
    1, 10,
    'Rarely', 'Daily',
    1.0, 7, TRUE, TRUE,
    'Psalm 119:105'
),
(
    '770e8400-e29b-41d4-a716-446655440008',
    'I find the Bible relevant and applicable to my daily life.',
    'Practical application of Scripture.',
    'scripture_engagement',
    'scale',
    1, 10,
    'Not relevant', 'Highly relevant',
    1.0, 8, TRUE, TRUE,
    '2 Timothy 3:16-17'
),
(
    '770e8400-e29b-41d4-a716-446655440009',
    'I can recall and apply Scripture in difficult situations.',
    'Scripture memory and practical application.',
    'scripture_engagement',
    'scale',
    1, 10,
    'Never', 'Always',
    0.9, 9, TRUE, TRUE,
    'Psalm 119:11'
),

-- Community
(
    '770e8400-e29b-41d4-a716-446655440010',
    'I am actively involved in a local church community.',
    'Regular participation in church life.',
    'community',
    'scale',
    1, 10,
    'Not at all', 'Very involved',
    1.0, 10, TRUE, TRUE,
    'Hebrews 10:24-25'
),
(
    '770e8400-e29b-41d4-a716-446655440011',
    'I have close Christian friendships that encourage my faith.',
    'Meaningful relationships with other believers.',
    'community',
    'scale',
    1, 10,
    'None', 'Many',
    1.0, 11, TRUE, TRUE,
    'Proverbs 27:17'
),
(
    '770e8400-e29b-41d4-a716-446655440012',
    'I am open and vulnerable with other believers about my struggles.',
    'Authenticity and accountability in Christian community.',
    'community',
    'scale',
    1, 10,
    'Never', 'Very open',
    0.9, 12, TRUE, TRUE,
    'James 5:16'
),

-- Service
(
    '770e8400-e29b-41d4-a716-446655440013',
    'I regularly use my gifts and abilities to serve others.',
    'Active service using God-given abilities.',
    'service',
    'scale',
    1, 10,
    'Rarely', 'Very regularly',
    1.0, 13, TRUE, TRUE,
    '1 Peter 4:10'
),
(
    '770e8400-e29b-41d4-a716-446655440014',
    'I actively look for opportunities to share my faith with others.',
    'Evangelism and sharing the gospel.',
    'service',
    'scale',
    1, 10,
    'Never', 'Always',
    1.0, 14, TRUE, TRUE,
    'Matthew 28:19-20'
),
(
    '770e8400-e29b-41d4-a716-446655440015',
    'I give generously of my time, talents, and resources.',
    'Stewardship and generosity.',
    'service',
    'scale',
    1, 10,
    'Rarely', 'Very generously',
    0.8, 15, TRUE, TRUE,
    '2 Corinthians 9:7'
),

-- Spiritual Disciplines
(
    '770e8400-e29b-41d4-a716-446655440016',
    'I practice spiritual disciplines like fasting, solitude, or journaling.',
    'Engagement with classical spiritual practices.',
    'spiritual_disciplines',
    'scale',
    1, 10,
    'Never', 'Regularly',
    0.8, 16, TRUE, TRUE,
    'Matthew 6:16-18'
),
(
    '770e8400-e29b-41d4-a716-446655440017',
    'I take regular time for sabbath rest and reflection.',
    'Intentional rest and spiritual refreshment.',
    'spiritual_disciplines',
    'scale',
    1, 10,
    'Never', 'Weekly',
    0.7, 17, TRUE, TRUE,
    'Exodus 20:8-10'
),

-- Heart Condition
(
    '770e8400-e29b-41d4-a716-446655440018',
    'I experience genuine joy and peace in my relationship with God.',
    'Fruit of the Spirit in your inner life.',
    'heart_condition',
    'scale',
    1, 10,
    'Rarely', 'Consistently',
    1.0, 18, TRUE, TRUE,
    'Galatians 5:22-23'
),
(
    '770e8400-e29b-41d4-a716-446655440019',
    'I am quick to confess sin and seek forgiveness.',
    'Sensitivity to sin and repentance.',
    'heart_condition',
    'scale',
    1, 10,
    'Very slow', 'Very quick',
    1.0, 19, TRUE, TRUE,
    '1 John 1:9'
),
(
    '770e8400-e29b-41d4-a716-446655440020',
    'My faith influences my thoughts, attitudes, and emotions.',
    'Integration of faith into inner life.',
    'heart_condition',
    'scale',
    1, 10,
    'Rarely', 'Constantly',
    1.0, 20, TRUE, TRUE,
    'Romans 12:2'
),

-- Life Integration
(
    '770e8400-e29b-41d4-a716-446655440021',
    'My faith influences my decisions at work or school.',
    'Faith integrated into professional/academic life.',
    'life_integration',
    'scale',
    1, 10,
    'Rarely', 'Always',
    1.0, 21, TRUE, TRUE,
    'Colossians 3:23'
),
(
    '770e8400-e29b-41d4-a716-446655440022',
    'I handle conflict and difficult relationships in a Christ-like manner.',
    'Faith applied in relational challenges.',
    'life_integration',
    'scale',
    1, 10,
    'Poorly', 'Very well',
    0.9, 22, TRUE, TRUE,
    'Ephesians 4:32'
),
(
    '770e8400-e29b-41d4-a716-446655440023',
    'My faith shapes how I use my finances and resources.',
    'Stewardship and financial decisions.',
    'life_integration',
    'scale',
    1, 10,
    'Not at all', 'Completely',
    0.8, 23, TRUE, TRUE,
    'Matthew 6:19-21'
),
(
    '770e8400-e29b-41d4-a716-446655440024',
    'I am growing and maturing in my faith compared to a year ago.',
    'Overall spiritual growth trajectory.',
    'life_integration',
    'scale',
    1, 10,
    'Not at all', 'Significantly',
    1.2, 24, TRUE, TRUE,
    '2 Peter 3:18'
);

-- =============================================================================
-- Update series devotional counts
-- =============================================================================

UPDATE public.series SET devotional_count = (
    SELECT COUNT(*) FROM public.devotionals
    WHERE devotionals.series_id = series.id AND devotionals.is_published = TRUE
);

-- =============================================================================
-- Sample output for verification
-- =============================================================================

-- After running this seed file, you should have:
-- 4 series
-- 3 devotionals (in the "Finding Your Identity in Christ" series)
-- 24 soul audit questions across 8 categories

SELECT 'Series count: ' || COUNT(*) FROM public.series;
SELECT 'Devotional count: ' || COUNT(*) FROM public.devotionals;
SELECT 'Soul Audit Question count: ' || COUNT(*) FROM public.soul_audit_questions;
