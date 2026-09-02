import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PITNEX_URL =
  process.env.PITNEX_URL ||
  "https://pitnex.name.ng";

export async function POST(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Post ID is required.",
        },
        { status: 400 }
      );
    }

    const { data: post, error: fetchError } =
      await supabase
        .from("posts")
        .select(
          "id,title,slug,excerpt,featured_image,published_at,status"
        )
        .eq("id", id)
        .single();

    if (fetchError || !post) {
      return NextResponse.json(
        {
          success: false,
          error: "Article not found.",
        },
        { status: 404 }
      );
    }

    const publishedAt =
      post.published_at || new Date().toISOString();

    const { data: updatedPost, error: updateError } =
      await supabase
        .from("posts")
        .update({
          status: "PUBLISHED",
          published_at: publishedAt,
        })
        .eq("id", id)
        .select(
          "id,title,slug,excerpt,featured_image,published_at,status"
        )
        .single();

    if (updateError) {
      throw updateError;
    }

    const taskResponse = await fetch(
      `${PITNEX_URL}/api/tasks/theindex`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: updatedPost.title,
          slug: updatedPost.slug,
          excerpt: updatedPost.excerpt,
          featured_image:
            updatedPost.featured_image,
          published_at:
            updatedPost.published_at,
        }),
      }
    );

    const taskResult = await taskResponse.json();

    if (!taskResponse.ok) {
      console.error(
        "PITNEX task creation failed:",
        taskResult
      );

      return NextResponse.json({
        success: true,
        published: true,
        taskCreated: false,
        warning:
          "Article published, but the PITNEX task could not be created.",
      });
    }

    return NextResponse.json({
      success: true,
      published: true,
      taskCreated: taskResult.created,
      taskId: taskResult.taskId || null,
      articleUrl:
        taskResult.articleUrl || null,
    });
  } catch (error) {
    console.error(
      "THE INDEX publish error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to publish article.",
      },
      { status: 500 }
    );
  }
}