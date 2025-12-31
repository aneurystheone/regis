
import React, { useState, useEffect } from 'react';
import type { Student, Class, AIFeatures } from '../types';
import { XIcon, DownloadIcon, DocumentAddIcon, ExclamationIcon, CameraIcon, SparklesIcon } from './icons';
import { extractStudentsFromImage } from '../services/geminiService';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: Omit<Student, 'id' | 'classId' | 'avatar'>[], classId: string) => void;
  classes: Class[];
  aiFeatures: AIFeatures;
}

type ParsedStudent = Omit<Student, 'id' | 'classId' | 'avatar'>;
type ParseResult = {
  valid: ParsedStudent[];
  invalid: { row: number; data: Record<string, string>; error: string }[];
};

const REQUIRED_HEADERS = ['name'];
const OPTIONAL_HEADERS = ['gender', 'email', 'phone', 'birthdate'];

export const StudentImportModal: React.FC<StudentImportModalProps> = ({ isOpen, onClose, onImport, classes, aiFeatures }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string>('');

  const [importMode, setImportMode] = useState<'csv' | 'image'>('csv');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedClassId(classes[0]?.id || '');
      setFile(null);
      setParseResult(null);
      setError('');
      setImportMode('csv');
      setIsAnalyzing(false);
      setImagePreviewUrl(null);
    }
  }, [isOpen, classes]);

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    setParseResult(null);
    setError('');
    setFile(null);

    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Por favor, seleccione un archivo con extensión .csv.');
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        setError('El archivo CSV está vacío o solo contiene la cabecera.');
        setParseResult(null);
        return;
      }

      let headerLine = lines[0];
      if (headerLine.charCodeAt(0) === 0xFEFF) {
        headerLine = headerLine.substring(1);
      }
      const header = headerLine.split(',').map(h => h.trim().toLowerCase());

      const missingHeaders = REQUIRED_HEADERS.filter(rh => !header.includes(rh));
      if (missingHeaders.length > 0) {
        setError(`Faltan las siguientes columnas requeridas: ${missingHeaders.join(', ')}.`);
        setParseResult(null);
        return;
      }

      const valid: ParsedStudent[] = [];
      const invalid: ParseResult['invalid'] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const rowData: Record<string, string> = {};
        header.forEach((h, index) => {
          rowData[h] = values[index]?.trim() || '';
        });

        const name = rowData.name;
        if (!name) {
          invalid.push({ row: i + 1, data: rowData, error: 'La columna "name" no puede estar vacía.' });
          continue;
        }

        const gender = rowData.gender?.toUpperCase();
        if (gender && gender !== 'M' && gender !== 'F') {
          invalid.push({ row: i + 1, data: rowData, error: 'La columna "gender" debe ser "M" o "F".' });
          continue;
        }

        const birthDate = rowData.birthdate;
        if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
          invalid.push({ row: i + 1, data: rowData, error: 'La columna "birthDate" debe estar en formato AAAA-MM-DD.' });
          continue;
        }

        valid.push({
          name,
          gender: gender as 'M' | 'F' | undefined,
          email: rowData.email || undefined,
          phone: rowData.phone || undefined,
          birthDate: birthDate || undefined
        });
      }
      setParseResult({ valid, invalid });
    };
    reader.onerror = () => {
      setError("Error al leer el archivo.");
      setParseResult(null);
    }
    reader.readAsText(csvFile);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    setParseResult(null);
    setError('');
    setFile(null);
    setImagePreviewUrl(null);

    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('Por favor, seleccione un archivo de imagen válido.');
        return;
      }

      setFile(selectedFile);

      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setImagePreviewUrl(imageUrl);
        analyzeImage(imageUrl);
      };
      reader.onerror = () => {
        setError("Error al leer el archivo de imagen.");
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const analyzeImage = async (imageDataUrl: string) => {
    setIsAnalyzing(true);
    setError('');
    try {
      const [meta, base64Data] = imageDataUrl.split(',');
      if (!meta || !base64Data) throw new Error("Formato de imagen no válido.");
      const mimeType = meta.split(':')[1].split(';')[0];

      const extractedData = await extractStudentsFromImage(base64Data, mimeType);

      if (extractedData.length > 0) {
        const validStudents: ParsedStudent[] = extractedData.map(s => ({
          ...s,
          gender: Math.random() > 0.5 ? 'M' : 'F',
        }));
        setParseResult({ valid: validStudents, invalid: [] });
      } else {
        setError("La IA no pudo extraer estudiantes de la imagen. Intente con una foto más clara o de mejor calidad.");
        setParseResult(null);
      }
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error durante el análisis de la IA.");
      setParseResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // BOM for Excel
      + "name,gender,email,phone,birthDate\n"
      + "Juan Perez,M,juan.p@example.com,809-111-2222,2014-05-15\n"
      + "Maria Rodriguez,F,maria.r@example.com,829-333-4444,2015-02-20\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_estudiantes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    if (parseResult && parseResult.valid.length > 0 && selectedClassId) {
      onImport(parseResult.valid, selectedClassId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]" role="document">
        <div className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Importar Estudiantes</h2>
            <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"><XIcon /></button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
          <button onClick={() => setImportMode('csv')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${importMode === 'csv' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Importar desde CSV
          </button>
          {aiFeatures.studentExtraction && (
            <button
              onClick={() => setImportMode('image')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${importMode === 'image' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <SparklesIcon className="w-4 h-4" /> Importar desde Imagen (IA)
            </button>
          )}
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {importMode === 'csv' ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/40 border-l-4 border-blue-500 text-blue-800 dark:text-blue-200">
              <p className="font-bold">Instrucciones</p>
              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                <li>El archivo debe ser formato CSV.</li>
                <li>La primera fila debe contener las cabeceras: <strong>name</strong> (obligatorio), gender, email, phone, birthDate (opcional).</li>
                <li>La columna `gender` debe ser 'M' (Masculino) o 'F' (Femenino).</li>
                <li>La columna `birthDate` debe estar en formato <strong>AAAA-MM-DD</strong>.</li>
                <li><button onClick={handleDownloadTemplate} className="font-semibold text-blue-600 dark:text-blue-300 hover:underline flex items-center gap-1"><DownloadIcon className="w-4 h-4" />Descargue una plantilla de ejemplo.</button></li>
              </ul>
            </div>
          ) : (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/40 border-l-4 border-purple-500 text-purple-800 dark:text-purple-200">
              <p className="font-bold flex items-center"><SparklesIcon className="w-5 h-5 mr-2" />Instrucciones para Importar con IA</p>
              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                <li>Tome una foto clara y bien iluminada de su lista de estudiantes.</li>
                <li>Asegúrese de que el texto sea legible y no esté borroso.</li>
                <li>La IA funciona mejor con listas impresas o con escritura clara.</li>
                <li>El sistema intentará extraer Nombres y Números de Orden.</li>
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="import-class-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Importar a la Clase</label>
              <select id="import-class-select" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} required
                className="block w-full text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.grade} {c.section}</option>)}
              </select>
            </div>
            {importMode === 'csv' ? (
              <div>
                <label htmlFor="csv-file-input" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Archivo CSV</label>
                <input id="csv-file-input" type="file" accept=".csv" onChange={handleCsvFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100" />
              </div>
            ) : (
              <div>
                <label htmlFor="image-file-input" className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 h-full">
                  <CameraIcon className="w-5 h-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{file ? file.name : 'Seleccionar Imagen'}</span>
                </label>
                <input id="image-file-input" type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
              </div>
            )}
          </div>

          {imagePreviewUrl && !isAnalyzing && importMode === 'image' && (
            <div className="mt-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Vista Previa de la Imagen</h3>
              <img src={imagePreviewUrl} alt="Previsualización de la lista de estudiantes" className="max-w-full max-h-48 mx-auto rounded-lg border dark:border-slate-600 shadow-sm" />
            </div>
          )}

          {error && <p className="text-red-600 dark:text-red-400 text-sm font-semibold text-center">{error}</p>}

          {isAnalyzing && (
            <div className="text-center p-4">
              <p className="text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">Analizando imagen con IA, por favor espere...</p>
              <div className="w-12 h-12 mx-auto mt-4 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          )}

          {parseResult && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Previsualización de Datos</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Se importarán <strong>{parseResult.valid.length}</strong> de <strong>{parseResult.valid.length + parseResult.invalid.length}</strong> estudiantes.</p>
              {parseResult.valid.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                  <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0 text-slate-800 dark:text-slate-100">
                      <tr>
                        <th className="p-2 font-semibold">Nombre</th>
                        <th className="p-2 font-semibold">Nº Orden</th>
                        <th className="p-2 hidden sm:table-cell font-semibold">Género</th>
                        <th className="p-2 hidden sm:table-cell font-semibold">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {parseResult.valid.slice(0, 10).map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="p-2">{s.name}</td>
                          <td className="p-2">{s.orderNumber}</td>
                          <td className="p-2 hidden sm:table-cell">{s.gender}</td>
                          <td className="p-2 hidden sm:table-cell">{s.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parseResult.valid.length > 10 && <p className="text-center text-xs p-1 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400">...y {parseResult.valid.length - 10} más.</p>}
                </div>
              )}
              {parseResult.invalid.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold text-yellow-600 dark:text-yellow-400 flex items-center"><ExclamationIcon className="w-5 h-5 mr-2" /> {parseResult.invalid.length} fila(s) con errores (no se importarán):</p>
                  <ul className="text-xs list-disc list-inside mt-1 text-slate-500 dark:text-slate-400">
                    {parseResult.invalid.map(inv => (
                      <li key={inv.row}>Fila {inv.row}: {inv.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">Cancelar</button>
          <button onClick={handleImportClick} disabled={!parseResult || parseResult.valid.length === 0 || isAnalyzing}
            className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 shadow-sm disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed">
            <DocumentAddIcon className="w-5 h-5 mr-2" />
            Importar {parseResult?.valid.length || ''} Estudiantes
          </button>
        </div>
      </div>
    </div>
  );
};
