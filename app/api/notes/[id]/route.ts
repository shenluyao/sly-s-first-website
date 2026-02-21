import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "缺少笔记 ID" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 先查询笔记以获取 file_url（用于可选地删除存储中的文件）
  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select("file_url")
    .eq("id", id)
    .single();

  if (fetchError || !note) {
    return NextResponse.json(
      { error: "笔记不存在或已删除" },
      { status: 404 }
    );
  }

  // 可选：从 Storage 删除文件（从 public URL 解析 path：.../notes/xxx 后的部分）
  try {
    const url = note.file_url as string;
    const match = url.match(/\/notes\/(.+)$/);
    if (match?.[1]) {
      const filePath = decodeURIComponent(match[1]);
      await supabase.storage.from("notes").remove([filePath]);
    }
  } catch {
    // 存储删除失败不阻断，仅删除数据库记录
  }

  const { error: deleteError } = await supabase
    .from("notes")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error(deleteError);
    return NextResponse.json(
      { error: "删除失败，请稍后重试" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
