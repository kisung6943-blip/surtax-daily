import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { PlatformType, SettlementOrder, CostMasterItem } from '../../dailyCalculatorTypes';
import { PLATFORMS } from '../../dailyCalculatorData/initialData';
import { parseSettlementExcel } from '../../dailyCalculatorUtils/excelParser';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  costMaster: CostMasterItem[];
  onUploadSuccess: (orders: SettlementOrder[]) => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  costMaster,
  onUploadSuccess,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('smartstore');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('엑셀 파일(.xlsx, .xls)을 선택해 주세요.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await parseSettlementExcel(file, selectedPlatform, costMaster);
      if (result.orders.length === 0) {
        setErrorMsg('엑셀 파일에서 읽어올 수 있는 정산 내역이 없습니다.');
      } else {
        onUploadSuccess(result.orders);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '엑셀 분석 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-lg">정산 엑셀 파일 업로드</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">1. 쇼핑몰 플랫폼 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                    selectedPlatform === platform.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {platform.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">2. 엑셀 파일 첨부 (.xlsx / .xls)</label>
            <label className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors">
              <Upload className="w-8 h-8 text-indigo-500 mb-2" />
              <span className="text-sm font-bold text-slate-700">
                {file ? file.name : '클릭하여 엑셀 파일 선택'}
              </span>
              <span className="text-xs text-slate-400 mt-1">스마트스토어, 쿠팡 등 정산 내역 다운로드 파일</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!file || isProcessing}
              onClick={handleUpload}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all flex items-center space-x-1.5 ${
                !file || isProcessing
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-md cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProcessing ? '엑셀 분석 중...' : '정산 데이터 가져오기'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
