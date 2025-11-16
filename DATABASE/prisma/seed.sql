-- Seed Script for Supabase SQL Editor
-- Run this in Supabase SQL Editor to populate tables with mock data

-- Step 1: Get or create default tenant
DO $$
DECLARE
    v_tenant_id TEXT;
BEGIN
    -- Get existing tenant or create new one
    SELECT id INTO v_tenant_id
    FROM tenants
    WHERE domain = 'dev.educore.local'
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        INSERT INTO tenants (id, name, domain, settings, created_at, updated_at)
        VALUES (
            gen_random_uuid()::text,
            'Development Tenant',
            'dev.educore.local',
            '{"queryRetentionDays": 90, "enableAuditLogs": true, "enablePersonalization": true}'::jsonb,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_tenant_id;
    END IF;

    -- Step 2: Create 10 microservices
    INSERT INTO microservices (
        id, tenant_id, name, service_id, display_name, description, 
        api_endpoint, version, is_active, settings, metadata, created_at, updated_at
    ) VALUES
        (gen_random_uuid()::text, v_tenant_id, 'assessment', 'assessment', 'Assessment Service', 'Handles assessments, quizzes, and evaluations', 'https://assessment.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'devlab', 'devlab', 'DevLab Service', 'Development lab environment and coding exercises', 'https://devlab.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'content', 'content', 'Content Management Service', 'Manages learning content, courses, and materials', 'https://content.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'analytics', 'analytics', 'Analytics Service', 'Learning analytics and progress tracking', 'https://analytics.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'user-management', 'user-management', 'User Management Service', 'User accounts, profiles, and authentication', 'https://users.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'notification', 'notification', 'Notification Service', 'Sends notifications and alerts to users', 'https://notifications.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'reporting', 'reporting', 'Reporting Service', 'Generates reports and analytics dashboards', 'https://reporting.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'integration', 'integration', 'Integration Service', 'Third-party integrations and API management', 'https://integration.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'ai-assistant', 'ai-assistant', 'AI Assistant Service', 'RAG microservice - Contextual AI assistant (this service)', 'https://ai-assistant.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'gateway', 'gateway', 'API Gateway', 'API Gateway for routing and load balancing', 'https://gateway.educore.local/api', '1.0.0', true, '{}'::jsonb, '{}'::jsonb, NOW(), NOW())
    ON CONFLICT (service_id) DO NOTHING;

    -- Step 3: Create access control rules
    INSERT INTO access_control_rules (
        id, tenant_id, rule_type, subject_type, subject_id, resource_type, 
        resource_id, permission, conditions, is_active, created_at, updated_at
    ) VALUES
        (gen_random_uuid()::text, v_tenant_id, 'RBAC', 'role', 'learner', 'course', NULL, 'read', '{}'::jsonb, true, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'RBAC', 'role', 'trainer', 'course', NULL, 'write', '{}'::jsonb, true, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'RBAC', 'role', 'hr', 'report', NULL, 'read', '{}'::jsonb, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Step 4: Create user profiles
    INSERT INTO user_profiles (
        id, tenant_id, user_id, role, department, region, 
        skill_gaps, learning_progress, preferences, metadata, created_at, updated_at
    ) VALUES
        (gen_random_uuid()::text, v_tenant_id, 'learner-001', 'learner', 'Engineering', 'US', 
         '["JavaScript", "React"]'::jsonb, 
         '{"completedCourses": 5, "inProgressCourses": 2}'::jsonb,
         '{"preferredLanguage": "en", "notificationEnabled": true}'::jsonb,
         '{}'::jsonb, NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'trainer-001', 'trainer', 'Education', 'US',
         '[]'::jsonb,
         '{}'::jsonb,
         '{"preferredLanguage": "en"}'::jsonb,
         '{}'::jsonb, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- Step 5: Create knowledge graph nodes
    INSERT INTO knowledge_graph_nodes (
        id, tenant_id, node_id, node_type, properties, created_at, updated_at
    ) VALUES
        (gen_random_uuid()::text, v_tenant_id, 'course:js-basics-101', 'course',
         '{"title": "JavaScript Basics 101", "description": "Introduction to JavaScript programming", "duration": 3600, "level": "beginner", "tags": ["javascript", "programming", "basics"]}'::jsonb,
         NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'skill:javascript', 'skill',
         '{"name": "JavaScript", "category": "programming", "difficulty": "intermediate"}'::jsonb,
         NOW(), NOW()),
        (gen_random_uuid()::text, v_tenant_id, 'user:learner-001', 'user',
         '{"name": "John Doe", "role": "learner", "department": "Engineering"}'::jsonb,
         NOW(), NOW())
    ON CONFLICT (node_id) DO NOTHING;

    -- Step 6: Create knowledge graph edges
    INSERT INTO knowledge_graph_edges (
        id, tenant_id, source_node_id, target_node_id, edge_type, weight, properties, created_at, updated_at
    )
    SELECT 
        gen_random_uuid()::text,
        v_tenant_id,
        'course:js-basics-101',
        'skill:javascript',
        'teaches',
        0.9,
        '{"confidence": 0.95}'::jsonb,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM knowledge_graph_edges 
        WHERE tenant_id = v_tenant_id 
        AND source_node_id = 'course:js-basics-101' 
        AND target_node_id = 'skill:javascript'
    )
    UNION ALL
    SELECT 
        gen_random_uuid()::text,
        v_tenant_id,
        'user:learner-001',
        'course:js-basics-101',
        'enrolled_in',
        1.0,
        jsonb_build_object('enrolledAt', NOW()::text, 'status', 'in_progress'),
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM knowledge_graph_edges 
        WHERE tenant_id = v_tenant_id 
        AND source_node_id = 'user:learner-001' 
        AND target_node_id = 'course:js-basics-101'
    )
    UNION ALL
    SELECT 
        gen_random_uuid()::text,
        v_tenant_id,
        'user:learner-001',
        'skill:javascript',
        'learning',
        0.5,
        '{"progress": 0.3}'::jsonb,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM knowledge_graph_edges 
        WHERE tenant_id = v_tenant_id 
        AND source_node_id = 'user:learner-001' 
        AND target_node_id = 'skill:javascript'
    );

    -- Step 7: Create sample query with sources
    DECLARE
        v_query_id TEXT;
        v_content_ms_id TEXT;
        v_assessment_ms_id TEXT;
    BEGIN
        -- Get microservice IDs
        SELECT id INTO v_content_ms_id FROM microservices WHERE service_id = 'content' AND tenant_id = v_tenant_id LIMIT 1;
        SELECT id INTO v_assessment_ms_id FROM microservices WHERE service_id = 'assessment' AND tenant_id = v_tenant_id LIMIT 1;

        -- Create query
        INSERT INTO queries (
            id, tenant_id, user_id, session_id, query_text, answer, confidence_score,
            processing_time_ms, model_version, is_personalized, is_cached, metadata, created_at
        ) VALUES (
            gen_random_uuid()::text,
            v_tenant_id,
            'learner-001',
            'session-001',
            'How do I start learning JavaScript?',
            'JavaScript is a versatile programming language. Start with the basics: variables, functions, and control flow. Then move on to DOM manipulation and async programming.',
            0.85,
            450,
            'gpt-4.1-mini',
            true,
            false,
            '{"sourcesCount": 3, "topK": 5}'::jsonb,
            NOW()
        )
        RETURNING id INTO v_query_id;

        -- Create query sources
        INSERT INTO query_sources (
            id, query_id, source_id, source_type, source_microservice, title,
            content_snippet, source_url, relevance_score, metadata, created_at
        ) VALUES
            (gen_random_uuid()::text, v_query_id, 'course:js-basics-101', 'course', 'content',
             'JavaScript Basics 101', 'Introduction to JavaScript programming...', '/courses/js-basics-101', 0.92,
             '{"section": "getting-started"}'::jsonb, NOW()),
            (gen_random_uuid()::text, v_query_id, 'assessment-001', 'assessment', 'assessment',
             'JavaScript Fundamentals Assessment', 'Test your knowledge of variables, functions...', '/assessments/js-fundamentals', 0.88,
             '{"difficulty": "beginner"}'::jsonb, NOW());

        -- Create query recommendations
        INSERT INTO query_recommendations (
            id, query_id, recommendation_type, recommendation_id, title, description, reason, priority, metadata, created_at
        ) VALUES (
            gen_random_uuid()::text, v_query_id, 'course', 'course:js-advanced-201',
            'JavaScript Advanced 201', 'Advanced JavaScript concepts and patterns', 'Build on your JavaScript basics', 1,
            '{"estimatedTime": 4800}'::jsonb, NOW()
        );
    END;

    RAISE NOTICE '✅ Seeding complete!';
    RAISE NOTICE '✅ Created tenant: dev.educore.local';
    RAISE NOTICE '✅ Created 10 microservices';
    RAISE NOTICE '✅ Created sample data';
END $$;

-- Verify the data
SELECT 
    'microservices' as table_name, COUNT(*) as count FROM microservices
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'knowledge_graph_nodes', COUNT(*) FROM knowledge_graph_nodes
UNION ALL
SELECT 'knowledge_graph_edges', COUNT(*) FROM knowledge_graph_edges
UNION ALL
SELECT 'queries', COUNT(*) FROM queries
UNION ALL
SELECT 'query_sources', COUNT(*) FROM query_sources
UNION ALL
SELECT 'access_control_rules', COUNT(*) FROM access_control_rules;

