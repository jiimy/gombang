// 개인 기록용일 경우
// 테마명(장소, 가격, 장르 자동입력), 일시, 참여인원(참여자를 적으면 자동카운트 - 참여자는 포지션/이름), 참여자, 코멘트
// 스포일러 항목 

// 개인 기록용을 외부 공개용으로 바꾸거나 외부공개용으로 작성할 경우. 
// 테마명, 일시, 추천인원, 장르, 가격, 참여자, 스포일러

interface formType {
  themeName?: string;
  date?: string;
  participants?: string;
  comment?: string;
  spoiler?: string;
};