import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

export const DOCUMENT_CATEGORIES = [
  { value: 'contrato', label: 'Contrato', color: '#5C6BC0' },
  { value: 'vigilancia', label: 'Vigilância sanitária', color: '#00897B' },
  { value: 'certificado', label: 'Certificado', color: '#7B1FA2' },
  { value: 'recibo', label: 'Recibo', color: '#F57C00' },
  { value: 'livre', label: 'Outro', color: '#78909C' },
] as const;

export function categoryMeta(category?: string) {
  const found = DOCUMENT_CATEGORIES.find((c) => c.value === category);
  return found ?? { value: '', label: 'Sem categoria', color: '#90A4AE' };
}

export function fmtFileSize(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function sumDocumentBytes(docs: { size?: number | null }[]): number {
  return docs.reduce((sum, doc) => sum + (doc.size ?? 0), 0);
}

export function fmtStorageTotal(bytes: number): string {
  if (bytes <= 0) return '0 B';
  return fmtFileSize(bytes);
}

export function canOpenDocument(doc: { storageKey?: string }): boolean {
  return !!doc.storageKey;
}

export function documentFileIcon(mimeType?: string): { Icon: SvgIconComponent; color: string } {
  const mime = mimeType?.toLowerCase() ?? '';
  if (mime.includes('pdf')) return { Icon: PictureAsPdfOutlinedIcon, color: '#D32F2F' };
  if (mime.startsWith('image/')) return { Icon: ImageOutlinedIcon, color: '#7B1FA2' };
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) {
    return { Icon: TableChartOutlinedIcon, color: '#2E7D32' };
  }
  if (mime.includes('word') || mime.includes('document') || mime.includes('text')) {
    return { Icon: DescriptionOutlinedIcon, color: '#1565C0' };
  }
  return { Icon: InsertDriveFileOutlinedIcon, color: '#546E7A' };
}
