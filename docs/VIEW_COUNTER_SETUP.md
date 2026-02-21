# 访问量计数器（Vercel KV）配置与使用

## 一、Vercel 后台开通并连接 KV

1. **创建 KV 存储**
   - 登录 [Vercel Dashboard](https://vercel.com/dashboard)
   - 进入你的项目 → 顶部 **Storage** 标签
   - 点击 **Create Database**，选择 **KV**
   - 按提示创建（可选用默认区域）

2. **连接项目**
   - 创建完成后，在 KV 详情页点击 **Connect Project**
   - 选择当前 Next.js 项目并连接
   - 连接后会自动为项目注入环境变量（无需手抄）

3. **本地开发环境变量**
   - 在项目根目录执行：
     ```bash
     npx vercel env pull .env.local
     ```
   - 或手动在 `.env.local` 中添加（从 Vercel 项目 Settings → Environment Variables 中复制）：
     ```
     KV_REST_API_URL=https://xxx.kv.vercel-storage.com
     KV_REST_API_TOKEN=***
     KV_REST_API_READ_ONLY_TOKEN=***   # 可选，只读用
     ```

## 二、安装依赖

```bash
npm install @vercel/kv
```

（若已按说明在 `package.json` 中加入 `@vercel/kv`，执行 `npm install` 即可。）

## 三、组件使用方式

### 1. 基本用法（推荐配合 Suspense）

用 `Suspense` 包裹，避免阻塞首屏，先显示 fallback：

```tsx
import { Suspense } from "react";
import { ViewCounter } from "@/components/ViewCounter";

// 在文章页或任意需要计数的页面
export default function PostPage({ params }: { params: { slug: string } }) {
  return (
    <article>
      <h1>文章标题</h1>
      <p>
        阅读量：
        <Suspense fallback={<span>—</span>}>
          <ViewCounter slug={params.slug} />
        </Suspense>
      </p>
      {/* ... */}
    </article>
  );
}
```

### 2. 自定义样式与 fallback

```tsx
<ViewCounter
  slug="about"
  className="font-medium text-neutral-600"
  fallback={<span className="animate-pulse">0</span>}
/>
```

### 3. 在首页或列表页展示多篇的阅读量

每篇使用独立 `slug`（如文章 id 或 slug）：

```tsx
{posts.map((post) => (
  <div key={post.id}>
    <h2>{post.title}</h2>
    <Suspense fallback="—">
      <ViewCounter slug={post.slug} />
    </Suspense>
  </div>
))}
```

## 四、防抖与去重说明

- **Cookie 去重**：同一访客在 7 天内多次打开同一 `slug` 页面，只会计数 1 次（通过 Cookie `v_<slug>` 判断）。
- **Strict Mode 双挂载**：组件内用 `useRef` 保证同一挂载周期只调用一次 Server Action，避免开发环境下重复 +1。
- 如需调整去重时长，可修改 `app/actions/view.ts` 中的 `COOKIE_MAX_AGE`。

## 五、性能说明

- 计数逻辑在 Server Action 中执行，不阻塞 React 服务端渲染。
- 建议用 `Suspense` 包裹 `<ViewCounter>`，首屏先渲染 fallback，计数就绪后再替换为数字。
- 读写均在 Vercel KV（Redis）完成，延迟低，适合高并发场景。
