import React from 'react';
import { X, Save, Settings } from 'lucide-react';
import { GlobalSettings } from '../../dailyCalculatorTypes';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GlobalSettings;
  onSaveSettings: (newSettings: GlobalSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [vatIncluded, setVatIncluded] = React.useState(settings.vatIncludedInCost);
  const [taxRate, setTaxRate] = React.useState(settings.corporateTaxRate);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      vatIncludedInCost: vatIncluded,
      corporateTaxRate: Number(taxRate),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-lg">정산 및 계산 옵션 설정</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={vatIncluded}
                onChange={(e) => setVatIncluded(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-sm font-semibold text-slate-800">
                입력 원가에 부가세(10%)가 포함되어 있음
              </span>
            </label>
            <p className="text-xs text-slate-400 pl-7">
              체크 해제 시 원가 입력금액에 부가세 10%가 별도로 합산되어 계산됩니다.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">법인세/소득세 추정 세율 (%)</label>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center space-x-1"
            >
              <Save className="w-4 h-4" />
              <span>설정 저장</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
