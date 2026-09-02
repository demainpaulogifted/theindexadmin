import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PITNEX_URL =
  process.env.PITNEX_URL || "https://pitnex.name.ng";

export async function POST(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Post ID is required." },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 1. Fetch the article
    // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    // 2. Mark as published
    // ─────────────────────────────────────────────
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

    if (updateError) {
      throw updateError;
    }

    // ─────────────────────────────────────────────
    // 3. Create Pitnex task
    // ─────────────────────────────────────────────
    let taskResult = null;
    let taskCreated = false;
    let taskWarning = null;

    try {
      const taskResponse = await fetch(
        `${PITNEX_URL}/api/tasks/theindex`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-pitnex-secret": process.env.PITNEX_TASK_SECRET || "",
          },
          body: JSON.stringify({
            title: updatedPost.title,
            slug: updatedPost.slug,
            excerpt: updatedPost.excerpt || "",
            featured_image: updatedPost.featured_image || "",
            published_at: updatedPost.published_at,
          }),
        }
      );

      taskResult = await taskResponse.json();

      if (!taskResponse.ok) {
        console.error("PITNEX task creation failed:", taskResult);
        taskWarning =
          taskResult?.error ||
          "Article published, but the PITNEX task could not be created.";
      } else {
        taskCreated = Boolean(taskResult.created);
      }
    } catch (err) {
      console.error("PITNEX network error:", err);
      taskWarning =
        "Article published, but could not reach the PITNEX server.";
    }

    // ─────────────────────────────────────────────
    // 4. Response
    // ─────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      published: true,
      taskCreated,
      taskId: taskResult?.taskId || null,
      articleUrl: taskResult?.articleUrl || null,
      warning: taskWarning,
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