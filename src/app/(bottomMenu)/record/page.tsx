'use client';
import { useQuery } from '@tanstack/react-query';
import { redirect, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import s from './mypage.module.scss';
import { createClient } from '@/util/supabase/client';
import { useForm, SubmitHandler } from "react-hook-form";

const RecodePage = () => {
  const router = useRouter();
  const supabase = createClient();

  // const { data } = useQuery({
  //   queryFn: () => myYoutubeUplaodApi(),
  //   queryKey: ['myYoutubeUpload']
  // });

  // const logout = async () => {
  //   const { error } = await supabase.auth.signOut();
  //   alert('로그아웃 되었습니다');
  //   router.push('/');
  // };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<formType>({ mode: "onChange" });

  const onSubmit: SubmitHandler<formType> = async (onData: formType) => {
    console.log(onData);
  }

  return (
    <>
      <div className="mb-6 flex items-center">
        <input
          type="checkbox"
          id="spoiler"
          className="mr-2 h-4 w-4 accent-primary"
          {...register("spoiler")}
        />
        <label htmlFor="spoiler" className="text-sm text-gray-900">
          공개 (체크 해제 시 비공개)
        </label>
      </div>
      <div className="">
        <div>
          <label
            htmlFor="name"
            className="block mb-2 text-sm font-medium text-gray-900 "
          >
            테마명
          </label>
          <input
            className="w-full p-16 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 "
            type="text"
            id="name"
            placeholder="입력해주세요"
            maxLength={20}
            {...register("themeName", {
              required: "테마명은 필수 입력입니다.",
              minLength: {
                value: 2,
                message: "2자리 이상 입력해주세요.",
              },
            })}
          />
        </div>
        {errors.themeName && (
          <small className="text-red-500">{errors.themeName.message}</small>
        )}
      </div>
      <div className="">
        <div>
          <label
            htmlFor="name"
            className="block mb-2 text-sm font-medium text-gray-900 "
          >
            테마명
          </label>
          <input
            className="w-full p-16 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 "
            type="text"
            id="name"
            placeholder="입력해주세요"
            maxLength={20}
            {...register("themeName", {
              required: "테마명은 필수 입력입니다.",
              minLength: {
                value: 2,
                message: "2자리 이상 입력해주세요.",
              },
            })}
          />
        </div>
        {errors.themeName && (
          <small className="text-red-500">{errors.themeName.message}</small>
        )}
      </div>
    </>
  );
};

export default RecodePage;