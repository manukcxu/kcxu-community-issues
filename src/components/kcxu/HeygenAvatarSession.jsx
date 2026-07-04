import { useEffect, useRef, useState } from 'react';
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType } from '@heygen/streaming-avatar';
import { base44 } from '@/api/base44Client';

export default function HeygenAvatarSession({ onSpeakReady }) {
  const videoRef = useRef(null);
  const avatarRef = useRef(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const res = await base44.functions.invoke('heygenToken', {});
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
        await avatar.createStartAvatar({ quality: AvatarQuality.Medium, avatarName: avatar_id });
        if (mounted && onSpeakReady) {
          onSpeakReady(async (text) => {
            try { await avatar.speak({ text, taskType: TaskType.REPEAT }); } catch (e) { console.error(e); }
          });
        }
      } catch (e) {
        console.error('HeyGen session error', e);
        if (mounted) setStatus('error');
      }
    };
    start();
    return () => { mounted = false; avatarRef.current?.stopAvatar?.(); };
  }, []);

  return (
    <div className="relative bg-black aspect-video">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      {status !== 'live' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          {status === 'connecting' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Connecting to KCXU Avatar Host...</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm px-6 text-center">Avatar host is unavailable right now — you can continue by text below.</p>
          )}
        </div>
      )}
      {status === 'live' && (
        <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">LIVE AVATAR</span>
      )}
    </div>
  );
}