import PostCard, { type PostCardData } from './PostCard';

type PostGridProps = {
  posts: PostCardData[];
};

export default function PostGrid({ posts }: PostGridProps) {
  return (
    <ul className="blog-grid m-0 flex w-full list-none flex-col p-0">
      {posts.map((post) => (
        <li
          key={post.link}
          className="border-b border-border py-8 first:pt-0 last:border-b-0 last:pb-0 max-[480px]:py-7"
        >
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  );
}
