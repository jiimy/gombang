
import Link from "next/link";
import s from './page.module.scss';


export default function Home() {

  return (
    <>
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
