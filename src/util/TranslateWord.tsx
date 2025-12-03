import axios from "axios";
import { franc } from 'franc';
import React, { useState, useEffect } from "react";

type translateType = {
  source: string;
  sourceLanguage?: string;
  id: string;
}

async function translate(source: string, sourceLanguage: string, targetLanguage: string) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURI(source)}`;

  try {
    const response = await axios.get(url);
    return response.data[0][0][0];
  } catch (error) {
    throw error;
  }
}

const detectLanguage = (input: string) => {
  const langCode = franc(input);
  return langCode;
};

// 특수문자 정리
export function cleanText(text: string): string {
  return text.replace(/&amp;quot;/g, "'").replace(/&amp;/g, "").replace(/#39;/g, "'").replace(/\n/g, " "); // 특수 문자 제거
}

const TranslateWord = ({ source, sourceLanguage = 'en', id }: translateType) => {
  const [outputText, setOutputText] = useState("");
  // const [idLanguageMap, setIdLanguageMap] = useState<{ [key: string]: string }>({}); // id별 언어 저장

  useEffect(() => {
    const fetchTranslation = async () => {
      const cleanedText = cleanText(source);

      // const detectedLanguage = idLanguageMap[id] || detectLanguage(cleanedText);

      // 언어가 감지된 경우에만 처리
      // if (!idLanguageMap[id] && detectedLanguage !== 'eng' && detectedLanguage !== 'en') {
      // }
      // setIdLanguageMap((prev) => ({ ...prev, [id]: detectedLanguage }));

      let intermediateText = cleanedText;

      // if (detectedLanguage !== 'eng' && detectedLanguage !== 'en') {
      // } 
      intermediateText = await translate(cleanedText, "es", "ko");
      setOutputText(intermediateText);
    };

    if (source) {
      fetchTranslation();
    } else {
      setOutputText("");
    }
  // }, [source, id, idLanguageMap]);
  }, []);

  return <>{outputText}</>;
};

export default TranslateWord;