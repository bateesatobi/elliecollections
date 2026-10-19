import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ImagePlus, Phone, Sparkles } from 'lucide-react';
import { Seo } from '../../components/Seo';
import { getCustomerToken, marketApi } from '../../services/api';
import { useMarket } from '../../store/MarketStore';
import { processLabel } from '../../utils/processCatalog';
import { runProcess } from '../../utils/processProgress';
import { swalError, swalSuccess } from '../../utils/swal';

const MAX_IMAGE_BYTES = 786_432;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function RequestPiecePage() {
  const { customer } = useMarket();
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Photo must be 1 MB or smaller. Compress it and try again.');
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      setPreview(url);
      setFileName(file.name);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that photo.');
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const token = getCustomerToken();
    if (!token) {
      setError('Sign in again to send this request.');
      return;
    }
    if (!preview) {
      setError('Upload a photo of the piece you want.');
      return;
    }
    if (description.trim().length < 8) {
      setError('Tell us a little more — size, colour, occasion, or budget.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await runProcess(
        {
          kind: 'submit',
          title: processLabel('client.request', 'Sending request…'),
          percent: 25,
        },
        async (set) => {
          set(50, 'Uploading your request…');
          await marketApi.createPieceRequest(token, {
            description: description.trim(),
            imageBase64: preview,
          });
        },
      );
      setSent(true);
      await swalSuccess(
        'Request sent',
        'We’ll use your account phone to follow up about this piece.',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send your request.';
      setError(msg);
      await swalError('Request failed', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ec-page">
      <Seo
        title="Request a piece"
        description="Upload a photo of what you need. Elliecollections will contact you on the phone used for your account."
        path="/request"
      />
      <header className="ec-page-hero">
        <p className="eyebrow">Can’t find it?</p>
        <h1>Request a piece</h1>
        <p className="muted">
          Send a photo and a short note. We reach you on the mobile number on your account.
        </p>
      </header>

      <div className="ec-page-body">
        {!customer ? (
          <div className="ec-page-card ec-request-gate">
            <Sparkles size={28} />
            <h2>Sign in to share your contact</h2>
            <p className="muted">
              We use the phone number on your Elliecollections account so our stylist can follow up.
            </p>
            <Link to="/signin?next=/request" className="btn btn-primary">
              Continue with phone
            </Link>
          </div>
        ) : sent ? (
          <div className="ec-page-card ec-request-gate">
            <Sparkles size={28} />
            <h2>We’ve got your request</h2>
            <p className="muted">
              We’ll WhatsApp or call {customer.phone || 'your account number'} about this look.
            </p>
            <div className="ec-page-actions">
              <Link to="/shop" className="btn btn-primary">
                Keep shopping
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSent(false);
                  setPreview(null);
                  setFileName('');
                  setDescription('');
                }}
              >
                Send another
              </button>
            </div>
          </div>
        ) : (
          <form className="ec-request-layout" onSubmit={onSubmit}>
            <label className={`ec-dropzone ${preview ? 'has-file' : ''}`}>
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(e) => void onPickFile(e.target.files?.[0])}
              />
              {preview ? (
                <img src={preview} alt="What you need" />
              ) : (
                <div className="ec-dropzone-copy">
                  <ImagePlus size={28} />
                  <strong>Upload a photo</strong>
                  <span>Screenshot, runway shot, or something you saw — max 1 MB.</span>
                </div>
              )}
              {fileName ? <em>{fileName}</em> : null}
            </label>

            <div className="ec-page-card">
              <div className="ec-contact-lock">
                <Phone size={18} />
                <div>
                  <span className="ec-contact-lock-label">We’ll contact</span>
                  <strong>{customer.name}</strong>
                  <span>{customer.phone || 'Phone on your account'}</span>
                </div>
              </div>

              <label className="field">
                <span>What do you need?</span>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Blush satin midi like this, size M, for a wedding in Kampala next month. Budget around 150,000."
                  required
                />
              </label>

              {error ? <div className="alert alert-error">{error}</div> : null}

              <button type="submit" className="btn btn-primary" disabled={busy}>
                <Camera size={16} />
                {busy ? 'Sending…' : 'Send request'}
              </button>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                We only use this to source or sew a close match — not to list your photo in the shop.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
