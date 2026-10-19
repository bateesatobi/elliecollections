import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const base = Swal.mixin({
  confirmButtonColor: '#1b5e20',
  cancelButtonColor: '#6b7280',
  buttonsStyling: true,
});

export async function swalSuccess(title: string, text?: string) {
  return base.fire({
    icon: 'success',
    title,
    text,
    timer: 2200,
    showConfirmButton: true,
  });
}

export async function swalError(title: string, text?: string) {
  return base.fire({
    icon: 'error',
    title,
    text: text || 'Something went wrong. Please try again.',
  });
}

export async function swalConfirm(title: string, text?: string) {
  const result = await base.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'Cancel',
  });
  return result.isConfirmed;
}

/** Login progress — shared process progress (modal + top bar). */
export {
  openLoginProgress,
  setLoginProgress,
  closeLoginProgress,
} from './processProgress';
