


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."fn_sync_semantic_link_document"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.target_block_id IS NOT NULL AND NEW.target_document_id IS NULL THEN
        SELECT document_id INTO NEW.target_document_id 
        FROM public.document_blocks 
        WHERE id = NEW.target_block_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_semantic_link_document"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_related_blocks_by_tags"("p_block_id" "uuid", "p_limit" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "document_id" "uuid", "shared_tags" "text"[], "similarity_score" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH current_block AS (
        SELECT tags FROM public.document_blocks WHERE id = p_block_id
    )
    SELECT 
        b.id,
        b.title,
        b.content,
        b.document_id,
        ARRAY(select unnest(b.tags) INTERSECT select unnest(cb.tags)) as shared_tags,
        cardinality(ARRAY(select unnest(b.tags) INTERSECT select unnest(cb.tags))) as similarity_score
    FROM 
        public.document_blocks b,
        current_block cb
    WHERE 
        b.id != p_block_id -- Exclude self
        AND b.tags && cb.tags -- Overlap operator (at least one common tag)
    ORDER BY 
        similarity_score DESC,
        b.created_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_related_blocks_by_tags"("p_block_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_block_comment_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_block_comment_timestamp"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_chat_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "project_id" "uuid",
    "context_type" "text" NOT NULL,
    "messages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "ai_chat_sessions_context_type_check" CHECK (("context_type" = ANY (ARRAY['global'::"text", 'document'::"text"])))
);


ALTER TABLE "public"."ai_chat_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_cognitive_memory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "memory_key" "text" NOT NULL,
    "memory_value" "text" NOT NULL,
    "confidence_score" double precision DEFAULT 0.0,
    "source_events" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."ai_cognitive_memory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_interaction_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "project_id" "uuid",
    "agent_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "prompt_used" "text",
    "ai_response" "jsonb",
    "user_feedback" "jsonb",
    "metrics" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."ai_interaction_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."block_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "block_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "input" "jsonb" DEFAULT '{}'::"jsonb",
    "output" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."block_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."block_comment_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."block_comment_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."block_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "block_id" "uuid",
    "text_selection" "text",
    "start_offset" integer,
    "end_offset" integer,
    "content" "text" NOT NULL,
    "comment_type" "text" DEFAULT 'review'::"text",
    "resolved" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "block_comments_comment_type_check" CHECK (("comment_type" = ANY (ARRAY['review'::"text", 'ai_instruction'::"text"])))
);


ALTER TABLE "public"."block_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."block_highlights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "block_id" "uuid" NOT NULL,
    "resource_id" "uuid",
    "extract_id" "uuid",
    "start_index" integer NOT NULL,
    "end_index" integer NOT NULL,
    "selected_text" "text" NOT NULL,
    "label" "text",
    "color" "text" DEFAULT 'yellow'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."block_highlights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."block_resource_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "block_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "extract_id" "uuid",
    "relation" "text" DEFAULT 'supports'::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."block_resource_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."block_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "block_id" "uuid",
    "version_number" integer NOT NULL,
    "title" "text",
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT false
);


ALTER TABLE "public"."block_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "order_index" integer NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "last_edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "parent_block_id" "uuid",
    "block_type" "text" DEFAULT 'section'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."document_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "description" "text",
    "snapshot" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."document_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text" DEFAULT 'main'::"text",
    "description" "text",
    CONSTRAINT "documents_category_check" CHECK (("category" = ANY (ARRAY['main'::"text", 'version'::"text", 'linked_ref'::"text", 'unlinked_ref'::"text"])))
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_extracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "label" "text",
    "excerpt" "text" NOT NULL,
    "locator" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."resource_extracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "title" "text" NOT NULL,
    "source_uri" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_path" "text",
    "mime_type" "text",
    "file_size" bigint,
    "ingest_status" "text" DEFAULT 'pending'::"text",
    "extracted_text" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "document_id" "uuid"
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."semantic_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_block_id" "uuid" NOT NULL,
    "target_block_id" "uuid",
    "target_document_id" "uuid",
    "link_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "semantic_links_link_type_check" CHECK (("link_type" = ANY (ARRAY['manual_ref'::"text", 'auto_mention'::"text", 'semantic_similarity'::"text", 'backlink'::"text"]))),
    CONSTRAINT "target_exists" CHECK ((("target_block_id" IS NOT NULL) OR ("target_document_id" IS NOT NULL)))
);


ALTER TABLE "public"."semantic_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tag_blacklist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tag_text" "text" NOT NULL,
    "project_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."tag_blacklist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_chat_sessions"
    ADD CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_cognitive_memory"
    ADD CONSTRAINT "ai_cognitive_memory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_cognitive_memory"
    ADD CONSTRAINT "ai_cognitive_memory_user_id_memory_key_key" UNIQUE ("user_id", "memory_key");



ALTER TABLE ONLY "public"."ai_interaction_logs"
    ADD CONSTRAINT "ai_interaction_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."block_actions"
    ADD CONSTRAINT "block_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."block_comment_replies"
    ADD CONSTRAINT "block_comment_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."block_comments"
    ADD CONSTRAINT "block_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."block_highlights"
    ADD CONSTRAINT "block_highlights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."block_resource_links"
    ADD CONSTRAINT "block_resource_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."block_versions"
    ADD CONSTRAINT "block_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_blocks"
    ADD CONSTRAINT "document_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_history"
    ADD CONSTRAINT "document_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_extracts"
    ADD CONSTRAINT "resource_extracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."semantic_links"
    ADD CONSTRAINT "semantic_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tag_blacklist"
    ADD CONSTRAINT "tag_blacklist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tag_blacklist"
    ADD CONSTRAINT "tag_blacklist_tag_text_key" UNIQUE ("tag_text");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_block_actions_block_id" ON "public"."block_actions" USING "btree" ("block_id");



CREATE INDEX "idx_block_comment_replies_comment_id" ON "public"."block_comment_replies" USING "btree" ("comment_id");



CREATE INDEX "idx_block_comments_block" ON "public"."block_comments" USING "btree" ("block_id");



CREATE INDEX "idx_block_comments_resolved" ON "public"."block_comments" USING "btree" ("block_id", "resolved");



CREATE INDEX "idx_block_highlights_block_id" ON "public"."block_highlights" USING "btree" ("block_id");



CREATE INDEX "idx_block_resource_links_block_id" ON "public"."block_resource_links" USING "btree" ("block_id");



CREATE INDEX "idx_block_resource_links_extract_id" ON "public"."block_resource_links" USING "btree" ("extract_id");



CREATE INDEX "idx_block_resource_links_resource_id" ON "public"."block_resource_links" USING "btree" ("resource_id");



CREATE INDEX "idx_block_versions_active" ON "public"."block_versions" USING "btree" ("block_id", "is_active");



CREATE INDEX "idx_block_versions_block" ON "public"."block_versions" USING "btree" ("block_id");



CREATE INDEX "idx_blocks_doc_order" ON "public"."document_blocks" USING "btree" ("document_id", "order_index") WHERE ("is_deleted" = false);



CREATE INDEX "idx_document_blocks_document_id" ON "public"."document_blocks" USING "btree" ("document_id");



CREATE INDEX "idx_document_blocks_parent" ON "public"."document_blocks" USING "btree" ("parent_block_id");



CREATE INDEX "idx_document_blocks_tags" ON "public"."document_blocks" USING "gin" ("tags");



CREATE INDEX "idx_document_history_created" ON "public"."document_history" USING "btree" ("created_at");



CREATE INDEX "idx_document_history_document" ON "public"."document_history" USING "btree" ("document_id");



CREATE INDEX "idx_documents_category" ON "public"."documents" USING "btree" ("category");



CREATE INDEX "idx_documents_project_category" ON "public"."documents" USING "btree" ("project_id", "category");



CREATE INDEX "idx_documents_project_id" ON "public"."documents" USING "btree" ("project_id");



CREATE INDEX "idx_projects_workspace_id" ON "public"."projects" USING "btree" ("workspace_id");



CREATE INDEX "idx_resource_extracts_resource_id" ON "public"."resource_extracts" USING "btree" ("resource_id");



CREATE INDEX "idx_resources_document_id" ON "public"."resources" USING "btree" ("document_id");



CREATE INDEX "idx_resources_kind" ON "public"."resources" USING "btree" ("kind");



CREATE INDEX "idx_resources_project_id" ON "public"."resources" USING "btree" ("project_id");



CREATE INDEX "idx_semantic_links_source_block" ON "public"."semantic_links" USING "btree" ("source_block_id");



CREATE INDEX "idx_semantic_links_target_block" ON "public"."semantic_links" USING "btree" ("target_block_id");



CREATE INDEX "idx_semantic_links_target_doc" ON "public"."semantic_links" USING "btree" ("target_document_id");



CREATE INDEX "idx_semantic_links_type" ON "public"."semantic_links" USING "btree" ("link_type");



CREATE OR REPLACE TRIGGER "block_comments_updated_at" BEFORE UPDATE ON "public"."block_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_block_comment_timestamp"();



CREATE OR REPLACE TRIGGER "tg_sync_semantic_link_document" BEFORE INSERT ON "public"."semantic_links" FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_semantic_link_document"();



ALTER TABLE ONLY "public"."ai_chat_sessions"
    ADD CONSTRAINT "ai_chat_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_chat_sessions"
    ADD CONSTRAINT "ai_chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_cognitive_memory"
    ADD CONSTRAINT "ai_cognitive_memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_interaction_logs"
    ADD CONSTRAINT "ai_interaction_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_interaction_logs"
    ADD CONSTRAINT "ai_interaction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."block_actions"
    ADD CONSTRAINT "block_actions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."document_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."block_comment_replies"
    ADD CONSTRAINT "block_comment_replies_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."block_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."block_comment_replies"
    ADD CONSTRAINT "block_comment_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."block_comments"
    ADD CONSTRAINT "block_comments_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."document_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."block_highlights"
    ADD CONSTRAINT "block_highlights_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."document_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."block_highlights"
    ADD CONSTRAINT "block_highlights_extract_id_fkey" FOREIGN KEY ("extract_id") REFERENCES "public"."resource_extracts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."block_highlights"
    ADD CONSTRAINT "block_highlights_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."block_resource_links"
    ADD CONSTRAINT "block_resource_links_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."document_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."block_resource_links"
    ADD CONSTRAINT "block_resource_links_extract_id_fkey" FOREIGN KEY ("extract_id") REFERENCES "public"."resource_extracts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."block_resource_links"
    ADD CONSTRAINT "block_resource_links_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."block_versions"
    ADD CONSTRAINT "block_versions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."document_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_blocks"
    ADD CONSTRAINT "document_blocks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_blocks"
    ADD CONSTRAINT "document_blocks_parent_block_id_fkey" FOREIGN KEY ("parent_block_id") REFERENCES "public"."document_blocks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_history"
    ADD CONSTRAINT "document_history_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_extracts"
    ADD CONSTRAINT "resource_extracts_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."semantic_links"
    ADD CONSTRAINT "semantic_links_source_block_id_fkey" FOREIGN KEY ("source_block_id") REFERENCES "public"."document_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."semantic_links"
    ADD CONSTRAINT "semantic_links_target_block_id_fkey" FOREIGN KEY ("target_block_id") REFERENCES "public"."document_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."semantic_links"
    ADD CONSTRAINT "semantic_links_target_document_id_fkey" FOREIGN KEY ("target_document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tag_blacklist"
    ADD CONSTRAINT "tag_blacklist_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all for authenticated users" ON "public"."block_actions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."block_highlights" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Semantic links are viewable by everyone in the workspace" ON "public"."semantic_links" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Semantic links can be deleted by authenticated users" ON "public"."semantic_links" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Semantic links can be inserted by authenticated users" ON "public"."semantic_links" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can add replies" ON "public"."block_comment_replies" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can delete from their project blacklists" ON "public"."tag_blacklist" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE ("projects"."id" = "tag_blacklist"."project_id"))));



CREATE POLICY "Users can insert into their project blacklists" ON "public"."tag_blacklist" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE ("projects"."id" = "tag_blacklist"."project_id"))));



CREATE POLICY "Users can manage their own logs" ON "public"."ai_interaction_logs" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own memories" ON "public"."ai_cognitive_memory" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view replies to comments they can see" ON "public"."block_comment_replies" FOR SELECT USING (true);



CREATE POLICY "Users can view their project blacklists" ON "public"."tag_blacklist" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE ("projects"."id" = "tag_blacklist"."project_id"))));



ALTER TABLE "public"."ai_cognitive_memory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_interaction_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."block_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."block_comment_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."block_highlights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tag_blacklist" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."fn_sync_semantic_link_document"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sync_semantic_link_document"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sync_semantic_link_document"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_related_blocks_by_tags"("p_block_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_related_blocks_by_tags"("p_block_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_related_blocks_by_tags"("p_block_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_block_comment_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_block_comment_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_block_comment_timestamp"() TO "service_role";


















GRANT ALL ON TABLE "public"."ai_chat_sessions" TO "anon";
GRANT ALL ON TABLE "public"."ai_chat_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_chat_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."ai_cognitive_memory" TO "anon";
GRANT ALL ON TABLE "public"."ai_cognitive_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_cognitive_memory" TO "service_role";



GRANT ALL ON TABLE "public"."ai_interaction_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_interaction_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_interaction_logs" TO "service_role";



GRANT ALL ON TABLE "public"."block_actions" TO "anon";
GRANT ALL ON TABLE "public"."block_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."block_actions" TO "service_role";



GRANT ALL ON TABLE "public"."block_comment_replies" TO "anon";
GRANT ALL ON TABLE "public"."block_comment_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."block_comment_replies" TO "service_role";



GRANT ALL ON TABLE "public"."block_comments" TO "anon";
GRANT ALL ON TABLE "public"."block_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."block_comments" TO "service_role";



GRANT ALL ON TABLE "public"."block_highlights" TO "anon";
GRANT ALL ON TABLE "public"."block_highlights" TO "authenticated";
GRANT ALL ON TABLE "public"."block_highlights" TO "service_role";



GRANT ALL ON TABLE "public"."block_resource_links" TO "anon";
GRANT ALL ON TABLE "public"."block_resource_links" TO "authenticated";
GRANT ALL ON TABLE "public"."block_resource_links" TO "service_role";



GRANT ALL ON TABLE "public"."block_versions" TO "anon";
GRANT ALL ON TABLE "public"."block_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."block_versions" TO "service_role";



GRANT ALL ON TABLE "public"."document_blocks" TO "anon";
GRANT ALL ON TABLE "public"."document_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."document_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."document_history" TO "anon";
GRANT ALL ON TABLE "public"."document_history" TO "authenticated";
GRANT ALL ON TABLE "public"."document_history" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."resource_extracts" TO "anon";
GRANT ALL ON TABLE "public"."resource_extracts" TO "authenticated";
GRANT ALL ON TABLE "public"."resource_extracts" TO "service_role";



GRANT ALL ON TABLE "public"."resources" TO "anon";
GRANT ALL ON TABLE "public"."resources" TO "authenticated";
GRANT ALL ON TABLE "public"."resources" TO "service_role";



GRANT ALL ON TABLE "public"."semantic_links" TO "anon";
GRANT ALL ON TABLE "public"."semantic_links" TO "authenticated";
GRANT ALL ON TABLE "public"."semantic_links" TO "service_role";



GRANT ALL ON TABLE "public"."tag_blacklist" TO "anon";
GRANT ALL ON TABLE "public"."tag_blacklist" TO "authenticated";
GRANT ALL ON TABLE "public"."tag_blacklist" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































