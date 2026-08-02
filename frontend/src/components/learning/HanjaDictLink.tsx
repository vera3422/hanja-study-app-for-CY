interface HanjaDictLinkProps {
  hanja: string;
  className?: string;
}

/**
 * 정답 확인 후 표시하는 네이버 한자사전 링크 아이콘.
 * 클릭 시 해당 한자를 네이버 한자사전에서 검색한 결과를 새 탭으로 연다.
 */
export default function HanjaDictLink({ hanja, className = '' }: HanjaDictLinkProps) {
  const openDict = () => {
    if (!hanja) return;
    const url = `https://hanja.dict.naver.com/#/search?query=${encodeURIComponent(hanja)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      onClick={openDict}
      title="네이버 한자사전에서 보기"
      aria-label={`${hanja} 네이버 한자사전 검색`}
      className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition shadow-sm border border-indigo-100 ${className}`}
    >
      <span className="text-base sm:text-lg leading-none" aria-hidden>
        📖
      </span>
    </button>
  );
}
