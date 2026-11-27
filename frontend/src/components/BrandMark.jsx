/**
 * Geometric brand mark representing stacked inventory layers and a demand horizon curve.
 */
export default function BrandMark({ className = "w-8 h-8" }) {
  return (
    <div
      className={`${className} rounded-[6px] bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-[18px] h-[18px] text-white dark:text-zinc-950"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 17l5-5 4 3 9-8" />
        <path d="M17 7h4v4" />
        <path d="M3 21h18" />
      </svg>
    </div>
  );
}
