"use client";

import { useThemeContext, ACCENT_COLORS } from "./ThemeProvider";
import { BottomSheet } from "./BottomSheet";
import { Icons } from "./Icons";

const Switch = ({ checked, onChange, disabled }: { checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }) => {
  const { settings } = useThemeContext();
  return (
    <button 
      disabled={disabled}
      onClick={() => onChange(!checked)} 
      className={`w-12 h-7 rounded-full relative transition-colors duration-300 ease-in-out focus:outline-none ${checked ? 'bg-[var(--accent)]' : 'bg-[#3A3A3C]'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ '--accent': settings.accentColor } as any}
    >
      <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
};

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { settings, updateSetting } = useThemeContext();
  
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Pengaturan" fullHeight>
      <div className="p-6 space-y-8 animate-fade-in">
        
        {/* Appearance */}
        <div>
          <h3 className="text-[#8E8E93] text-[13px] font-bold tracking-wider uppercase mb-3">Tampilan & Warna</h3>
          <div className="bg-[#1C1C1E] rounded-[20px] p-4 border border-white/5 space-y-5">
            <div>
              <p className="text-white text-[15px] font-medium mb-3">Warna Aksen</p>
              <div className="flex gap-3 flex-wrap">
                {ACCENT_COLORS.map(c => (
                  <button key={c.id} onClick={() => updateSetting('accentColor', c.hex)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${settings.accentColor === c.hex ? 'ring-2 ring-white scale-110' : 'ring-0 scale-100 hover:scale-105'}`} style={{ backgroundColor: c.hex }}>
                    {settings.accentColor === c.hex && <Icons.Check cls="w-5 h-5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-5 border-t border-[#2C2C2E]">
              <div>
                <p className="text-white text-[15px] font-medium">Tema Gelap (Dark Mode)</p>
                <p className="text-[#8E8E93] text-[12px]">Gunakan latar hitam pekat</p>
              </div>
              <Switch checked={settings.appTheme === 'dark'} onChange={(v) => updateSetting('appTheme', v ? 'dark' : 'light')} />
            </div>
          </div>
        </div>

        {/* Video Preferences */}
        <div>
          <h3 className="text-[#8E8E93] text-[13px] font-bold tracking-wider uppercase mb-3">Preferensi Tontonan</h3>
          <div className="bg-[#1C1C1E] rounded-[20px] overflow-hidden border border-white/5">
            <div className="flex items-center justify-between p-4 border-b border-[#2C2C2E]">
              <p className="text-white text-[15px] font-medium">Kualitas Video Default</p>
              <select value={settings.videoQuality} onChange={(e) => updateSetting('videoQuality', e.target.value)} className="bg-transparent text-[#0A84FF] font-medium text-[15px] outline-none text-right cursor-pointer" style={{ color: settings.accentColor }}>
                {['Auto', '1080p', '720p', '480p', 'Data Saver'].map(q => <option key={q} value={q} className="bg-[#2C2C2E] text-white">{q}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-[#2C2C2E]">
              <p className="text-white text-[15px] font-medium">Bahasa Subtitle</p>
              <select value={settings.subtitleLang} onChange={(e) => updateSetting('subtitleLang', e.target.value)} className="bg-transparent text-[#0A84FF] font-medium text-[15px] outline-none text-right cursor-pointer" style={{ color: settings.accentColor }}>
                {['Indonesia', 'English', 'Off'].map(q => <option key={q} value={q} className="bg-[#2C2C2E] text-white">{q}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-[#2C2C2E]">
              <div><p className="text-white text-[15px] font-medium">Putar Otomatis (Auto-play)</p></div>
              <Switch checked={settings.autoPlayNext} onChange={(v) => updateSetting('autoPlayNext', v)} />
            </div>
            <div className="flex items-center justify-between p-4">
              <div><p className="text-white text-[15px] font-medium">Lewati Intro (Skip Opening)</p></div>
              <Switch checked={settings.skipIntro} onChange={(v) => updateSetting('skipIntro', v)} />
            </div>
          </div>
        </div>

        {/* Privacy & Storage */}
        <div>
          <h3 className="text-[#8E8E93] text-[13px] font-bold tracking-wider uppercase mb-3">Privasi & Data</h3>
          <div className="bg-[#1C1C1E] rounded-[20px] overflow-hidden border border-white/5">
            <div className="flex items-center justify-between p-4 border-b border-[#2C2C2E]">
              <div>
                <p className="text-white text-[15px] font-medium flex items-center gap-2">Mode Penyamaran <span className="px-1.5 bg-[#FF453A]/20 text-[#FF453A] text-[9px] rounded font-bold">BETA</span></p>
                <p className="text-[#8E8E93] text-[12px]">Jangan simpan riwayat tontonan baru</p>
              </div>
              <Switch checked={settings.incognitoMode} onChange={(v) => updateSetting('incognitoMode', v)} />
            </div>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full text-left p-4 text-[#FF453A] font-medium text-[15px] active:bg-[#2C2C2E] transition-colors">
              Hapus Semua Data Aplikasi (Reset)
            </button>
          </div>
        </div>

        <div className="pt-4 text-center">
          <p className="text-[#48484A] text-[12px] font-medium mb-1">Anime Scraper Pro Enterprise</p>
          <p className="text-[#48484A] text-[10px]">Dibuat dengan semangat di Indonesia</p>
        </div>
      </div>
    </BottomSheet>
  );
};
