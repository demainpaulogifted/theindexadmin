import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_REWARD_KOBO = 5000; // ₦50
const DEFAULT_MAX_COMPLETIONS = 1000;

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Post ID is required." },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 1. Fetch article
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("id, title, slug, excerpt, featured_image, published_at, status")
      .eq("id", id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { success: false, error: "Article not found." },
        { status: 404 }
      );
    }

    // 2. Mark published
    const publishedAt = post.published_at || new Date().toISOString();

    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({
        status: "PUBLISHED",
        published_at: publishedAt,
      })
      .eq("id", id)
      .select("id, title, slug, excerpt, featured_image, published_at, status")
      .single();

    if (updateError) throw updateError;

    // 3. Article URL
    const articleUrl = `https://theindex.name.ng/posts/${encodeURIComponent(
      updatedPost.slug
    )}`;

    // 4. Already exists?
    const { data: existing } = await supabase
      .from("pitnex_tasks")
      .select("id")
      .eq("article_url", articleUrl)
      .limit(1);

    let taskId = existing?.[0]?.id || null;
    let taskCreated = false;

    // 5. Create task if needed
    if (!taskId) {
      const { data: newTask, error: insertError } = await supabase
        .from("pitnex_tasks")
        .insert({
          type: "ARTICLE",
          title: `Read: ${updatedPost.title}`,
          instructions:
            updatedPost.excerpt ||
            `Read this article on THE INDEX: ${updatedPost.title}`,
          article_url: articleUrl,
          reward_kobo: DEFAULT_REWARD_KOBO,
          max_completions: DEFAULT_MAX_COMPLETIONS,
          starts_at: updatedPost.published_at || new Date().toISOString(),
          is_active: true,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("PITNEX task insert failed:", insertError);

        return NextResponse.json({
          success: true,
          published: true,
          taskCreated: false,
          warning:
            "Article published, but the PITNEX task could not be created.",
          errorDetail: insertError.message,
        });
      }

      taskId = newTask.id;
      taskCreated = true;
    }

    return NextResponse.json({
      success: true,
      published: true,
      taskCreated,
      taskId,
      articleUrl,
    });
  } catch (error) {
    console.error("THE INDEX publish error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unable to publish article.",
      },
      { status: 500 }
    );
  }
}