import AdminShell from '../../components/admin/AdminShell.jsx'
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx'
import useAdminSettings from '../../hooks/useAdminSettings.js'

const TIMEZONES = [
  { value: 'UTC+0', label: 'UTC+0 — London' },
  { value: 'UTC+3', label: 'UTC+3 — Moscow' },
  { value: 'UTC-5', label: 'UTC-5 — New York' },
]

function isDirtyField(settings, original, key) {
  return settings?.[key] !== original?.[key]
}

function SkelProject() {
  return (
    <div className="settings-section">
      <div className="sec-header">
        <div className="skel" style={{ height: 10, width: 60 }} />
      </div>
      <div className="sec-body">
        <div className="sett-field-row">
          <div className="sett-field">
            <div className="skel" style={{ height: 9, width: 80, marginBottom: 6 }} />
            <div className="skel" style={{ height: 34, borderRadius: 'var(--r8)' }} />
          </div>
          <div className="sett-field">
            <div className="skel" style={{ height: 9, width: 100, marginBottom: 6 }} />
            <div className="skel" style={{ height: 34, borderRadius: 'var(--r8)' }} />
          </div>
        </div>
        <div className="sett-field" style={{ maxWidth: 280 }}>
          <div className="skel" style={{ height: 9, width: 70, marginBottom: 6 }} />
          <div className="skel" style={{ height: 34, borderRadius: 'var(--r8)' }} />
        </div>
      </div>
    </div>
  )
}

function SkelToggles({ rows }) {
  return (
    <div className="settings-section">
      <div className="sec-header">
        <div className="skel" style={{ height: 10, width: 55 }} />
      </div>
      <div className="sec-body" style={{ gap: 0, padding: '0 16px' }}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="toggle-row">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div className="skel" style={{ height: 11, width: `${45 + i * 10}%` }} />
              <div className="skel" style={{ height: 9, width: `${65 + i * 5}%` }} />
            </div>
            <div className="skel" style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SkelSecurity() {
  return (
    <div className="settings-section">
      <div className="sec-header">
        <div className="skel" style={{ height: 10, width: 65 }} />
      </div>
      <div className="sec-body">
        <div className="toggle-row" style={{ borderBottom: '1px solid var(--brd-s)', paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="skel" style={{ height: 11, width: '60%' }} />
            <div className="skel" style={{ height: 9, width: '80%' }} />
          </div>
          <div className="skel" style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0 }} />
        </div>
        <div className="sett-field-row">
          <div className="sett-field">
            <div className="skel" style={{ height: 9, width: 120, marginBottom: 6 }} />
            <div className="skel" style={{ height: 34, width: 100, borderRadius: 'var(--r8)' }} />
          </div>
          <div className="sett-field">
            <div className="skel" style={{ height: 9, width: 110, marginBottom: 6 }} />
            <div className="skel" style={{ height: 34, width: 100, borderRadius: 'var(--r8)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminSettings() {
  const {
    settings, original, loading, saving, savedMsg, error,
    dirty, updateField, discard, save,
  } = useAdminSettings()

  return (
    <AdminShell>
      <div className="content-header">
        <div>
          <div className="page-title">Settings</div>
          <div
            className="page-sub"
            style={saving ? { color: 'var(--muted)' } : dirty ? { color: 'var(--warn)' } : {}}
          >
            {saving ? 'Saving…'
              : dirty   ? '● Unsaved changes'
              : loading ? 'Loading…'
              : 'Platform configuration'}
          </div>
        </div>
        {!loading && (
          <div className="header-actions">
            {dirty && !saving && (
              <span className="discard-link" onClick={discard}>Discard</span>
            )}
            <button
              className="abtn pri"
              disabled={!dirty || saving}
              onClick={save}
              style={saving ? { opacity: 0.6 } : {}}
            >
              {saving && <span className="spin" style={{ width: 12, height: 12 }} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="content-body">
        {error && (
          <div className="admin-error">⚠️ {error}</div>
        )}

        {loading ? (
          <>
            <SkelProject />
            <SkelToggles rows={3} />
            <SkelSecurity />
          </>
        ) : settings && (
          <div
            style={{
              opacity: saving ? 0.5 : 1,
              pointerEvents: saving ? 'none' : 'auto',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            {/* Project */}
            <div className="settings-section">
              <div className="sec-header">
                <div className="sec-title">Project</div>
                <div className="sec-desc">General platform identity</div>
              </div>
              <div className="sec-body">
                <div className="sett-field-row">
                  <div className="sett-field">
                    <div className="sett-label">Project Name</div>
                    <input
                      className={`sett-input${isDirtyField(settings, original, 'projectName') ? ' dirty' : ''}`}
                      value={settings.projectName}
                      onChange={e => updateField('projectName', e.target.value)}
                    />
                  </div>
                  <div className="sett-field">
                    <div className="sett-label">Primary Domain</div>
                    <input
                      className={`sett-input${isDirtyField(settings, original, 'domain') ? ' dirty' : ''}`}
                      value={settings.domain}
                      onChange={e => updateField('domain', e.target.value)}
                    />
                  </div>
                </div>
                <div className="sett-field" style={{ maxWidth: 280 }}>
                  <div className="sett-label">Timezone</div>
                  <select
                    className="sett-select"
                    value={settings.timezone}
                    onChange={e => updateField('timezone', e.target.value)}
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="settings-section">
              <div className="sec-header">
                <div className="sec-title">Features</div>
                <div className="sec-desc">Enable or disable platform capabilities</div>
              </div>
              <div className="sec-body" style={{ gap: 0, padding: '0 16px' }}>
                <div className="toggle-row">
                  <div className="toggle-info">
                    <div className="toggle-name">Auto-deploy on push</div>
                    <div className="toggle-desc">Automatically deploy when a new commit is pushed to the main branch</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.autoDeploy}
                    onChange={v => updateField('autoDeploy', v)}
                  />
                </div>
                <div className="toggle-row">
                  <div className="toggle-info">
                    <div className="toggle-name">Health monitoring</div>
                    <div className="toggle-desc">Continuously monitor service health and send alerts on failure</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.healthMonitoring}
                    onChange={v => updateField('healthMonitoring', v)}
                  />
                </div>
                <div className="toggle-row">
                  <div className="toggle-info">
                    <div className="toggle-name">Debug mode</div>
                    <div className="toggle-desc">Enable verbose logging and error details</div>
                    <div className="toggle-warn">⚠️ Do not enable in production</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.debugMode}
                    warning={settings.debugMode}
                    onChange={v => updateField('debugMode', v)}
                  />
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="settings-section">
              <div className="sec-header">
                <div className="sec-title">Security</div>
                <div className="sec-desc">Authentication and access controls</div>
              </div>
              <div className="sec-body">
                <div
                  className="toggle-row"
                  style={{ borderBottom: '1px solid var(--brd-s)', paddingBottom: 14, marginBottom: 14 }}
                >
                  <div className="toggle-info">
                    <div className="toggle-name">Force 2FA for all users</div>
                    <div className="toggle-desc">Require two-factor authentication on next login</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.force2fa}
                    onChange={v => updateField('force2fa', v)}
                  />
                </div>
                <div className="sett-field-row">
                  <div className="sett-field">
                    <div className="sett-label">Session Timeout (minutes)</div>
                    <input
                      className={`sett-num-input${isDirtyField(settings, original, 'sessionTimeout') ? ' dirty' : ''}`}
                      type="number"
                      min="0"
                      value={settings.sessionTimeout}
                      onChange={e => updateField('sessionTimeout', Number(e.target.value))}
                    />
                    <div className="input-hint">0 = never expire</div>
                  </div>
                  <div className="sett-field">
                    <div className="sett-label">Max Login Attempts</div>
                    <input
                      className={`sett-num-input${isDirtyField(settings, original, 'maxLoginAttempts') ? ' dirty' : ''}`}
                      type="number"
                      min="1"
                      value={settings.maxLoginAttempts}
                      onChange={e => updateField('maxLoginAttempts', Number(e.target.value))}
                    />
                    <div className="input-hint">Before account lockout</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {savedMsg && (
        <div className="toast-fixed">
          <div className="toast-dot ok" />
          {savedMsg}
        </div>
      )}
    </AdminShell>
  )
}
