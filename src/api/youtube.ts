import axios from "axios";

// 유튜브 스크립트 추출
// 시작 (start) 부터 몇개까지 보여줄지 (end)
export async function fetchTranscript(id: string) {
  try {
    const response = await axios.get(`/api/youtube?videoId=${id}`);

    if (response?.data?.transcript) {
      const transcript = response?.data?.transcript;
      return transcript;
    }
  } catch (err) {
    console.error("스크립트 추출 실패", err);
  }
}

// 유튜브 info
export async function youtubeInfoApi(id: string) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${id}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`;

  try {
    const response = await axios.get(url);
    if (response.data.items.length > 0) {
      return response.data.items[0];
    } else {
      console.error("No video found");
    }
  } catch (err) {
    console.error("테스트 실패", err);
  }
}

// 유튜브 정보 추출
export async function fetchVideoInfo(id: string) {
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}&part=snippet`;

  try {
    const response = await axios.get(url);
    if (response.data.items.length > 0) {
      return response.data.items[0];
    } else {
      console.error("No video found");
    }
  } catch (err) {
    console.error("유튜브 정보 추출 실패", err);
  }
}

// 유튜브 채널 정보 추출
// export async function fetchChannelInfo(id: string) {
//   try {
//     const response = await axios.get(
//       `https://www.googleapis.com/youtube/v3/channels?id=${id}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}&part=snippet`
//     );
//     return response.data.items[0];
//   } catch (err) {
//     console.error(err);
//   }
// }

// 비디오의 채널 프로필 이미지 가져오기
// export async function getChannelProfileImage(videoId: string) {
//   const videoInfo = await fetchVideoInfo(videoId);
//   if (videoInfo) {
//     const channelId = videoInfo.snippet.channelId;
//     const channelInfo = await fetchChannelInfo(channelId);
//     if (channelInfo) {
//       return channelInfo.snippet.thumbnails.default.url;
//     }
//   }
//   return null;
// }

// 내가 업로드한 유튜브 정보
export async function myYoutubeUplaodApi() {
  try {
    const res = await axios.get("/api/youtube/user");

    if (res.status === 200) {
      return res.data.data;
    }
  } catch (error) {
    console.error("Error fetching feed data:", error);
    return [];
  }
}
