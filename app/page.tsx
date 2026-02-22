"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { Trash2, Upload, FileText, ExternalLink, X } from "lucide-react";
import { ViewCounter } from "@/components/ViewCounter";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabaseClient";

interface Todo {
  id: string;
  title: string;
  is_complete: boolean;
  day: string; // YYYY-MM-DD
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isMarkdownFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith(".md") || lowerName.endsWith(".markdown");
}

function isImageFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return (
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".gif") ||
    lowerName.endsWith(".webp") ||
    lowerName.endsWith(".svg")
  );
}

export default function DailyTodoPage() {
  // Todo 相关状态
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note 相关状态
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Markdown Modal 相关状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoadingMarkdown, setIsLoadingMarkdown] = useState(false);
  const [currentNoteTitle, setCurrentNoteTitle] = useState<string>("");

  const today = useMemo(() => getTodayString(), []);

  const completedCount = todos.filter((t) => t.is_complete).length;
  const totalCount = todos.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // 加载 Todos
  useEffect(() => {
    const fetchTodos = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("todos")
        .select("*")
        .eq("day", today)
        .order("created_at", { ascending: true });

      if (supabaseError) {
        console.error(supabaseError);
        setError("加载待办事项失败，请稍后重试。");
      } else if (data) {
        setTodos(data as Todo[]);
      }

      setIsLoading(false);
    };

    void fetchTodos();
  }, [today]);

  // 加载 Notes
  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoadingNotes(true);
      setNoteError(null);

      const { data, error: supabaseError } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (supabaseError) {
        console.error(supabaseError);
        setNoteError("加载笔记失败，请稍后重试。");
      } else if (data) {
        setNotes(data as Note[]);
      }

      setIsLoadingNotes(false);
    };

    void fetchNotes();
  }, []);

  // 监听 ESC 键关闭 Modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const handleAddTodo = async () => {
    const title = input.trim();
    if (!title) return;

    setIsSubmitting(true);
    setError(null);

    const { data, error: supabaseError } = await supabase
      .from("todos")
      .insert({
        title,
        is_complete: false,
        day: today,
      })
      .select()
      .single();

    if (supabaseError) {
      console.error(supabaseError);
      setError("添加待办事项失败，请稍后重试。");
    } else if (data) {
      setTodos((prev) => [...prev, data as Todo]);
      setInput("");
    }

    setIsSubmitting(false);
  };

  const handleToggleTodo = async (todo: Todo) => {
    const nextCompleted = !todo.is_complete;

    // 乐观更新
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, is_complete: nextCompleted } : t))
    );

    const { error: supabaseError } = await supabase
      .from("todos")
      .update({ is_complete: nextCompleted })
      .eq("id", todo.id);

    if (supabaseError) {
      console.error(supabaseError);
      setError("更新任务状态失败，已恢复原状态。");
      // 回滚
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, is_complete: todo.is_complete } : t))
      );
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    // 乐观删除
    const current = todos;
    setTodos((prev) => prev.filter((t) => t.id !== todoId));

    const { error: supabaseError } = await supabase
      .from("todos")
      .delete()
      .eq("id", todoId);

    if (supabaseError) {
      console.error(supabaseError);
      setError("删除任务失败，已恢复原数据。");
      setTodos(current);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!isSubmitting) {
        void handleAddTodo();
      }
    }
  };

  // 笔记上传处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ["application/pdf", "text/markdown", "text/x-markdown"];
      const allowedExtensions = [".pdf", ".md", ".markdown"];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

      if (
        allowedTypes.includes(file.type) ||
        allowedExtensions.includes(fileExtension)
      ) {
        setSelectedFile(file);
        setNoteError(null);
      } else {
        setNoteError("只支持 PDF 或 Markdown 格式的文件。");
        setSelectedFile(null);
      }
    }
  };

  const handleUploadNote = async () => {
    if (!selectedFile || !noteTitle.trim()) {
      setNoteError("请选择文件并填写笔记标题。");
      return;
    }

    setIsUploading(true);
    setNoteError(null);

    try {
      // 生成唯一文件名
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf("."));
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
      const filePath = fileName;

      // 上传文件到 Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("notes")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        setNoteError("文件上传失败，请稍后重试。");
        setIsUploading(false);
        return;
      }

      // 获取文件的公共 URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("notes").getPublicUrl(filePath);

      // 保存笔记信息到数据库
      const { data: noteData, error: dbError } = await supabase
        .from("notes")
        .insert({
          title: noteTitle.trim(),
          file_url: publicUrl,
          file_name: selectedFile.name,
        })
        .select()
        .single();

      if (dbError) {
        console.error(dbError);
        setNoteError("保存笔记信息失败，请稍后重试。");
        // 尝试删除已上传的文件
        await supabase.storage.from("notes").remove([filePath]);
      } else if (noteData) {
        setNotes((prev) => [noteData as Note, ...prev]);
        setNoteTitle("");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (err) {
      console.error(err);
      setNoteError("上传过程中发生错误，请稍后重试。");
    }

    setIsUploading(false);
  };

  // 加载 Markdown 文件内容
  const loadMarkdownContent = async (fileUrl: string) => {
    setIsLoadingMarkdown(true);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch markdown file");
      }
      const text = await response.text();
      setMarkdownContent(text);
    } catch (err) {
      console.error(err);
      setMarkdownContent("**加载失败**：无法读取 Markdown 文件内容。");
    } finally {
      setIsLoadingMarkdown(false);
    }
  };

  // 处理笔记点击
  const handleOpenNote = async (note: Note) => {
    if (isMarkdownFile(note.file_name)) {
      // Markdown 文件：打开 Modal
      setCurrentNoteTitle(note.title);
      setIsModalOpen(true);
      await loadMarkdownContent(note.file_url);
    } else {
      // PDF 或图片：在新标签页打开
      window.open(note.file_url, "_blank");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setMarkdownContent("");
    setCurrentNoteTitle("");
  };

  // 删除笔记
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("确定要删除这条笔记吗？删除后无法恢复。")) return;

    const prevNotes = notes;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setNoteError(null);

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNoteError(data?.error ?? "删除失败，请稍后重试。");
        setNotes(prevNotes);
      }
    } catch (err) {
      console.error(err);
      setNoteError("删除失败，请稍后重试。");
      setNotes(prevNotes);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {/* 顶部标题 */}
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 mb-2">
            DAILY
          </p>
          <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight mb-1">
            每日 To-Do List
          </h1>
          <p className="text-sm text-neutral-500">
            {today} · 用一个干净的小清单，整理你今天最重要的事情。
            {" · "}
            本页访问{" "}
            <Suspense fallback={<span>—</span>}>
              <ViewCounter slug="daily" />
            </Suspense>{" "}
            次
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* To-Do List 卡片 */}
          <main className="rounded-2xl border border-neutral-200 bg-white/90 shadow-sm backdrop-blur-sm">
            {/* 输入区域 */}
            <div className="border-b border-neutral-200 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 flex items-center justify-center rounded-full border border-dashed border-neutral-300 text-neutral-400">
                  +
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="写下你今天想完成的一件事…"
                  className="flex-1 border-none bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => void handleAddTodo()}
                  disabled={isSubmitting || !input.trim()}
                  className="inline-flex items-center rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  添加
                </button>
              </div>
            </div>

            {/* 内容区域 */}
            <section className="px-4 py-3 sm:px-5 sm:py-4">
              {/* 状态与进度 */}
              <div className="mb-4 flex items-center justify-between gap-3 text-xs text-neutral-500">
                <span>
                  今日任务{" "}
                  <span className="font-medium text-neutral-800">
                    {completedCount}/{totalCount || 0}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <span>进度 {progress}%</span>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-neutral-900 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mb-3 rounded-xl border border-red-100 bg-red-50/80 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* 列表 */}
              <div className="space-y-1.5">
                {isLoading ? (
                  <p className="py-4 text-center text-xs text-neutral-400">
                    正在加载今日任务…
                  </p>
                ) : todos.length === 0 ? (
                  <p className="py-4 text-center text-xs text-neutral-400">
                    今天还没有任务，先添加一条吧。
                  </p>
                ) : (
                  todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="group flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-neutral-800 transition hover:bg-neutral-50"
                    >
                      {/* 圆形勾选框 */}
                      <button
                        type="button"
                        aria-label={todo.is_complete ? "标记为未完成" : "标记为已完成"}
                        onClick={() => void handleToggleTodo(todo)}
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-900 shadow-[0_0_0_1px_rgba(0,0,0,0.02)] transition group-hover:border-neutral-400"
                      >
                        {todo.is_complete && (
                          <div className="h-3 w-3 rounded-full bg-neutral-900" />
                        )}
                      </button>

                      {/* 文本 */}
                      <div className="flex-1">
                        <p
                          className={`whitespace-pre-wrap break-words text-[13px] leading-relaxed ${
                            todo.is_complete
                              ? "text-neutral-400 line-through"
                              : "text-neutral-900"
                          }`}
                        >
                          {todo.title}
                        </p>
                      </div>

                      {/* 删除按钮 */}
                      <button
                        type="button"
                        aria-label="删除任务"
                        onClick={() => void handleDeleteTodo(todo.id)}
                        className="invisible flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition hover:bg-red-50 hover:text-red-500 group-hover:visible"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </main>

          {/* 笔记模块 */}
          <aside className="rounded-2xl border border-neutral-200 bg-white/90 shadow-sm backdrop-blur-sm">
            {/* 笔记标题 */}
            <div className="border-b border-neutral-200 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-neutral-500" />
                <h2 className="text-sm font-semibold text-neutral-900">个人笔记</h2>
              </div>

              {/* 上传区域 */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="笔记标题"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.md,.markdown,application/pdf,text/markdown"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex-1 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 transition hover:bg-neutral-50 hover:border-neutral-300"
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{selectedFile ? selectedFile.name : "选择文件 (PDF/MD)"}</span>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleUploadNote()}
                    disabled={isUploading || !selectedFile || !noteTitle.trim()}
                    className="inline-flex items-center rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                  >
                    {isUploading ? "上传中..." : "上传"}
                  </button>
                </div>

                {/* 笔记错误提示 */}
                {noteError && (
                  <div className="rounded-xl border border-red-100 bg-red-50/80 px-3 py-2 text-xs text-red-700">
                    {noteError}
                  </div>
                )}
              </div>
            </div>

            {/* 笔记列表 */}
            <section className="px-4 py-3 sm:px-5 sm:py-4">
              <div className="space-y-2">
                {isLoadingNotes ? (
                  <p className="py-4 text-center text-xs text-neutral-400">
                    正在加载笔记…
                  </p>
                ) : notes.length === 0 ? (
                  <p className="py-4 text-center text-xs text-neutral-400">
                    还没有笔记，上传一个吧。
                  </p>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="group rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-300 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-neutral-900 mb-1 truncate">
                            {note.title}
                          </h3>
                          <p className="text-xs text-neutral-500 mb-2">
                            {formatDate(note.created_at)}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            {note.file_name}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenNote(note)}
                            className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 transition hover:bg-neutral-50 hover:border-neutral-300"
                            aria-label="查看笔记"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 hover:border-red-300"
                            aria-label="删除笔记"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Markdown 预览 Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal 头部 */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 bg-white dark:bg-neutral-900">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{currentNoteTitle}</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-neutral-900 dark:text-white transition hover:bg-neutral-200 dark:hover:bg-neutral-800"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal 内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-white dark:bg-neutral-900">
              {isLoadingMarkdown ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">正在加载内容…</p>
                </div>
              ) : (
                <div className="prose prose-neutral dark:prose-invert max-w-none w-full">
                  <ReactMarkdown
                    components={{
                      img: ({ src, alt }) => {
                        const srcStr = typeof src === "string" ? src : "";
                        // 检查是否是空字符串或本地相对路径
                        if (!srcStr || srcStr === "" || (!srcStr.startsWith("http") && !srcStr.startsWith("/"))) {
                          return (
                            <span className="inline-block rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400">
                              <span className="font-medium">[本地图片无法显示]</span>
                              {alt && <span className="ml-1">({alt})</span>}
                            </span>
                          );
                        }
                        // 有效的图片 URL，正常渲染
                        return <img src={srcStr} alt={alt || ""} className="rounded-lg" />;
                      },
                    }}
                  >
                    {markdownContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
