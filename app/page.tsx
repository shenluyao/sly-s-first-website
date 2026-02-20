interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const todos: Todo[] = [
  { id: 1, text: "学习 Next.js 基础", completed: false },
  { id: 2, text: "完成项目文档", completed: true },
  { id: 3, text: "准备演示文稿", completed: false },
  { id: 4, text: "回复邮件", completed: false },
  { id: 5, text: "购买生活用品", completed: true },
];

export default function Home() {
  const completedCount = todos.filter((todo) => todo.completed).length;
  const totalCount = todos.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">待办事项</h1>
          <p className="text-gray-600">
            已完成 {completedCount} / {totalCount} 项任务
          </p>
        </div>

        {/* Todo List 容器 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            {/* 进度条 */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>进度</span>
                <span>
                  {Math.round((completedCount / totalCount) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Todo 列表 */}
            <div className="space-y-3">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`flex items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                    todo.completed
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white border-gray-300 hover:border-indigo-400 hover:shadow-md"
                  }`}
                >
                  {/* 复选框 */}
                  <div className="flex-shrink-0 mr-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                        todo.completed
                          ? "bg-indigo-500 border-indigo-500"
                          : "border-gray-300 hover:border-indigo-400"
                      }`}
                    >
                      {todo.completed && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Todo 文本 */}
                  <div className="flex-1">
                    <p
                      className={`text-gray-800 ${
                        todo.completed
                          ? "line-through text-gray-500"
                          : "font-medium"
                      }`}
                    >
                      {todo.text}
                    </p>
                  </div>

                  {/* 状态标签 */}
                  {todo.completed && (
                    <span className="ml-4 px-2 py-1 text-xs font-semibold text-indigo-600 bg-indigo-100 rounded-full">
                      已完成
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* 底部统计信息 */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between text-sm text-gray-600">
              <span>总计: {totalCount} 项</span>
              <span>剩余: {totalCount - completedCount} 项</span>
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <p className="text-center text-gray-500 text-sm mt-6">
          这是一个静态演示页面
        </p>
      </div>
    </div>
  );
}
