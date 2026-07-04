import { useEffect, useRef, useState } from 'react';
import StreamingAvatar, { AvatarQuality, StreamingEvents } from '@heygen/streaming-avatar';
import { base44 } from '@/api/base44Client';

export default function AvatarSession({ lang, onReady }) {
  const videoRef = useRef(null);
  const avatarRef = useRef(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const res = await base44.functions.invoke('heygenSession', {});
        const { token, avatar_id } = res.data;
        const avatar = new StreamingAvatar({ token });
        avatarRef.current = avatar;
        avatar.on(StreamingEvents.STREAM_READY, (event) => {
          if (videoRef.current && event.detail) {
            videoRef.current.srcObject = event.detail;
            videoRef.current.play();
          }
          if (mounted) setStatus('live');
        });
        await avatar.createStartAvatar({
          quality: AvatarQuality.Medium,
          avatarName: avatar_id,
          language: lang || 'en'
        });
        if (onReady) onReady(avatar);
      } catch (e) {
        console.error('Avatar session failed:', e);
        if (mounted) setStatus('error');
      }
    };
    start();
    return () => {
      mounted = false;
      avatarRef.current?.stopAvatar?.();
    };
  }, []);

  return (
    <div className="relative bg-gray-900 aspect-video">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      {status !== 'live' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          {status === 'connecting' ? (
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-[#F5C200] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Connecting to the KCXU live host…</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm px-6 text-center">The live avatar host is unavailable right now — you can continue in the chat below.</p>
          )}
        </div>
      )}
      {status === 'live' && (
        <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          Live
        </span>
      )}
    </div>
  );
}