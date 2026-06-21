import PostCard, { type PostCardData } from './PostCard';

type PostGridProps = {
  posts: PostCardData[];
};

export default function PostGrid({ posts }: PostGridProps) {
  return (
    <ul className="blog-grid m-0 flex w-full list-none flex-col gap-10 p-0 max-[480px]:gap-[30px]">
      {posts.map((post) => (
        <li key={post.link}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  );
}
