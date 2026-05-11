
import Link from "next/link";
import s from './page.module.scss';


export default function Home() {

  return (
    <>
      <div className="absolute opacity-0">
        <h1>방탈출 기록을 관리하고 통계 및 분석하는 서비스</h1>
        <p>
          방탈출 테마 기록, 성공률 분석,
          함께한 멤버 기록과 통계를 관리할 수 있습니다.
        </p>
      </div>
      <div className={`content ${s.content__container}`}>
        <div className={s.content__wrap}>
          <Link href="/record" className={`${s.card} ${s.card__record}`}>
            <span className={s.card__icon} aria-hidden>✏️</span>
            <span className={s.card__title}>기록하기</span>
          </Link>
          <Link href="/mypage/history" className={`${s.card} ${s.card__history}`}>
            <span className={s.card__icon} aria-hidden>📖</span>
            <span className={s.card__title}>기록보기</span>
          </Link>
          <Link href="/mypage/analysis" className={`${s.card} ${s.card__analysis}`}>
            <span className={s.card__icon} aria-hidden>📊</span>
            <span className={s.card__title}>통계보기</span>
          </Link>
        </div>
      </div>
      {/* <BottomMenu /> */}
    </>
  );
}
