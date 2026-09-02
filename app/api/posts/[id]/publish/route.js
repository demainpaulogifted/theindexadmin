import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DEFAULT_REWARD_KOBO = 5000; // ₦50
const DEFAULT_MAX_COMPLETIONS = 1000;

export async function POST(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Post ID is required." },
        { status: 400 }
      );
    }

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

    // 2. Mark as published
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

    // 3. Build article URL
    const articleUrl = `https://theindex.name.ng/posts/${encodeURIComponent(
      updatedPost.slug
    )}`;

    // 4. Check if task already exists (same Supabase project)
    const { data: existingTasks, error: existingError } = await supabase
      .from("pitnex_tasks")
      .select("id")
      .eq("article_url", articleUrl)
      .limit(1);

    if (existingError) {
      console.error("Existing task check failed:", existingError);
    }

    let taskId = existingTasks?.[0]?.id || null;
    let taskCreated = false;

    // 5. Create task if it does not exist
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