/**
 * Sensident — helpers concis pour toasts de succes / erreur.
 * Centralise pour eviter de dupliquer showToast(x, 'success') / showToast(y, 'error')
 * dans chaque composant formulaire.
 */
import { showToast } from './toast';

export const toastSuccess = (message: string) => showToast(message, 'success');
export const toastError = (message: string) => showToast(message, 'error');
export const toastInfo = (message: string) => showToast(message, 'info');
