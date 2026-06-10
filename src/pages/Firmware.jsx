import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Cpu, Upload, Trash2, CheckCircle, Wifi } from 'lucide-react';

const Firmware = () => {
  const [firmwares, setFirmwares] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFirmware();
  }, []);

  async function fetchFirmware() {
    try {
      setLoading(true);
      const data = await api.get('/api/firmware/list');
      setFirmwares(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load firmware logs:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.bin')) {
        setFile(selectedFile);
        setUploadError('');
        // Suggest a version code if empty based on file name
        const match = selectedFile.name.match(/v?\d+\.\d+\.\d+/);
        if (match && !version) {
          setVersion(match[0].startsWith('v') ? match[0] : 'v' + match[0]);
        }
      } else {
        setFile(null);
        setUploadError('Only .bin firmware binary files are supported!');
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !version) {
      setUploadError('Please select a .bin file and specify the release version.');
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setUploading(true);

    const formData = new FormData();
    formData.append('firmware', file);
    formData.append('version', version);
    formData.append('description', description);

    try {
      await api.uploadFirmware(formData);
      setUploadSuccess(`Firmware version ${version} uploaded successfully!`);
      setVersion('');
      setDescription('');
      setFile(null);
      
      // Clear file input manually
      const fileInput = document.getElementById('firmware-file-input');
      if (fileInput) fileInput.value = '';

      await fetchFirmware();
    } catch (err) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.patch(`/api/firmware/${id}/activate`, {});
      setFirmwares(prev => prev.map(f => ({
        ...f,
        is_active: Number(f.id) === Number(id) ? 1 : 0
      })));
    } catch (err) {
      console.error('Failed to activate release:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this firmware binary? ESP32s will not be able to flash this release.')) return;
    try {
      await api.delete(`/api/firmware/${id}`);
      setFirmwares(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Failed to delete release:', err);
    }
  };

  const activeFirmware = firmwares.find(f => Number(f.is_active) === 1 || f.is_active === true);

  return (
    <div className="slide-in">
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Firmware Updates & OTA Portal</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Deploy OTA updates for your Smart Solar ESP32 Controllers globally. Upload binary payloads and activate target builds.
        </p>
      </header>

      {/* OTA Status Header Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Active release status card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{
            width: '74px',
            height: '74px',
            borderRadius: '16px',
            background: activeFirmware ? 'rgba(0, 255, 160, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            border: activeFirmware ? '1px solid rgba(0, 255, 160, 0.2)' : '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeFirmware ? '#00ffa0' : 'var(--text-muted)',
            position: 'relative'
          }}>
            <Wifi size={32} className={activeFirmware ? 'pulse-soft' : ''} />
            {activeFirmware && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '10px',
                height: '10px',
                background: '#00ffa0',
                borderRadius: '50%',
                boxShadow: '0 0 10px #00ffa0'
              }}></span>
            )}
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Active OTA Broadcast
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {activeFirmware ? activeFirmware.version : 'NO BROADCAST RELEASE'}
              {activeFirmware && <span className="badge success">Active OTA</span>}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
              {activeFirmware ? activeFirmware.description : 'Please upload and activate a version to enable ESP32 firmware updates.'}
            </p>
          </div>
        </div>

        {/* Dynamic Hardware URL details card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            ESP32 API Telemetry Route
          </span>
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: 'hsl(var(--primary))',
            wordBreak: 'break-all'
          }}>
            GET http://&lt;server-ip&gt;:5000/api/firmware/ota/check?current_version=1.0.0
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            ESP32 checks this endpoint periodically. If a new version is active, it requests the streamed binary update.
          </span>
        </div>
      </div>

      {/* Main Actions block */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Upload Column */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} color="hsl(var(--primary))" />
            Upload .bin binary
          </h3>

          {uploadError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', padding: '12px', fontSize: '13px', marginBottom: '16px', fontWeight: 500 }}>
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10b981', padding: '12px', fontSize: '13px', marginBottom: '16px', fontWeight: 500 }}>
              {uploadSuccess}
            </div>
          )}

          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label>Release Version Code</label>
              <input
                type="text"
                placeholder="e.g. v1.2.0"
                className="glass-input"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div className="form-group">
              <label>Binary Payload (.bin)</label>
              <div 
                style={{
                  border: '2px dashed var(--glass-border)',
                  borderRadius: '10px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: file ? 'rgba(255, 125, 0, 0.03)' : 'transparent',
                  borderColor: file ? 'hsl(var(--primary))' : 'var(--glass-border)',
                  transition: 'var(--transition-fast)'
                }}
                onClick={() => document.getElementById('firmware-file-input').click()}
              >
                <Cpu size={24} style={{ color: file ? 'hsl(var(--primary))' : 'var(--text-muted)', marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>
                  {file ? file.name : 'Select or drop firmware.bin'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Payload must be a single compiled .bin file'}
                </div>
                <input
                  id="firmware-file-input"
                  type="file"
                  accept=".bin"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Release Notes / Changelog</label>
              <textarea
                placeholder="Fixes Wi-Fi loops, optimizes Solar panel charging curves..."
                className="glass-input"
                style={{ height: '80px', resize: 'none' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
              />
            </div>

            <button
              type="submit"
              className="glass-btn primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={uploading}
            >
              {uploading ? 'Streaming to Server...' : 'Flash Upload to Repository'}
            </button>
          </form>
        </div>

        {/* History Catalog Column */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#fff' }}>
            Firmware Version History
          </h3>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
              <div style={{ width: '30px', height: '30px', border: '3px solid rgba(255,125,0,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin-slow 1s linear infinite' }}></div>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Build Version</th>
                    <th>Payload Size</th>
                    <th>Upload Telemetry</th>
                    <th style={{ textAlign: 'right' }}>Management</th>
                  </tr>
                </thead>
                <tbody>
                  {firmwares.map((firm) => (
                    <tr key={firm.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>{firm.version}</span>
                          {(Number(firm.is_active) === 1 || firm.is_active === true) && <span className="badge success" style={{ padding: '2px 6px', fontSize: '10px' }}>ACTIVE OTA</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {firm.description || 'No release description.'}
                        </div>
                      </td>
                      <td>{(firm.file_size / (1024 * 1024)).toFixed(2)} MB</td>
                      <td>
                        <div style={{ fontSize: '13px', color: '#fff' }}>{firm.uploader_name || 'System Admin'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {new Date(firm.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {Number(firm.is_active) !== 1 && firm.is_active !== true ? (
                            <button
                              className="glass-btn primary"
                              style={{ padding: '5px 10px', fontSize: '11px' }}
                              onClick={() => handleActivate(firm.id)}
                            >
                              Activate
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#00ffa0', fontStyle: 'italic', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={10} /> Live Broadcast
                            </span>
                          )}
                          
                          {Number(firm.is_active) !== 1 && firm.is_active !== true && (
                            <button
                              className="glass-btn danger"
                              style={{ padding: '5px 10px', display: 'flex', alignItems: 'center' }}
                              onClick={() => handleDelete(firm.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {firmwares.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        No firmware binaries flashed to date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Firmware;
