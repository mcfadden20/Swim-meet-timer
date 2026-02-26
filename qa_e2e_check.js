const fs = require('fs');
const path = require('path');

const base = 'http://localhost:3000';

const request = async (url, options = {}) => {
  const response = await fetch(base + url, options);
  const text = await response.text();
  return { ok: response.ok, status: response.status, body: text };
};

(async () => {
  const checks = [];
  const addCheck = (name, pass, details) => checks.push({ name, pass, details });

  try {
    let response = await request('/api/health');
    addCheck('API up', response.ok && response.body.includes('"ok":true'), `status=${response.status} body=${response.body}`);

    response = await request('/api/admin/meets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `QA Meet ${Date.now()}`, org_id: 1 }),
    });

    const meet = response.ok ? JSON.parse(response.body) : null;
    addCheck('Create meet', response.ok && !!meet?.id, `status=${response.status} body=${response.body}`);

    const meetId = meet?.id;

    response = await request('/api/join-meet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: meet?.access_code }),
    });
    const joinPayload = response.ok ? JSON.parse(response.body) : null;
    addCheck(
      'Join meet returns access code',
      response.ok && joinPayload?.meet?.access_code === meet?.access_code,
      `status=${response.status} body=${response.body}`
    );

    response = await request('/api/times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meet_id: meetId,
        event_number: 5,
        heat_number: 2,
        lane: 3,
        time_ms: 65432,
        is_no_show: false,
      }),
    });
    const timeNormal = response.ok ? JSON.parse(response.body) : null;
    addCheck('Timer save (normal)', response.ok && !!timeNormal?.id, `status=${response.status} body=${response.body}`);

    response = await request('/api/times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meet_id: meetId,
        event_number: 5,
        heat_number: 2,
        lane: 4,
        time_ms: 0,
        is_no_show: true,
      }),
    });
    const timeNoShow = response.ok ? JSON.parse(response.body) : null;
    addCheck('No-show save', response.ok && !!timeNoShow?.id, `status=${response.status} body=${response.body}`);

    response = await request('/api/times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meet_id: meetId,
        event_number: 5,
        heat_number: 2,
        lane: 5,
        time_ms: 0,
        is_no_show: false,
        swimmer_name: '',
        is_dq: true,
        dq_code: '101.1',
        dq_description: 'False Start',
        official_initials: 'QA',
      }),
    });
    const timeDQ = response.ok ? JSON.parse(response.body) : null;
    addCheck('Official DQ save', response.ok && !!timeDQ?.id, `status=${response.status} body=${response.body}`);

    response = await request(`/api/admin/meets/${meetId}/results`);
    const rows = response.ok ? JSON.parse(response.body).results || [] : [];

    const hasNormal = rows.some(
      (row) => row.id === timeNormal?.id && row.time_ms === 65432 && row.event_number === 5 && row.heat_number === 2 && row.lane === 3
    );
    const hasNoShow = rows.some((row) => row.id === timeNoShow?.id && row.is_no_show === 1);
    const hasDQ = rows.some((row) => row.id === timeDQ?.id && row.is_dq === 1 && row.dq_code === '101.1');

    addCheck('Admin results show all', response.ok && hasNormal && hasNoShow && hasDQ, `status=${response.status} rows=${rows.length}`);

    response = await request(`/api/times?meet_id=${meetId}`);
    const scopedTimes = response.ok ? JSON.parse(response.body) : [];
    const allScoped = scopedTimes.every((row) => row.meet_id === meetId);
    addCheck('Times API is meet-scoped', response.ok && allScoped, `status=${response.status} rows=${scopedTimes.length}`);

    response = await request('/api/times');
    addCheck('Times API requires meet_id', response.status === 400, `status=${response.status} body=${response.body}`);

    response = await request(`/api/times/${timeNormal?.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_number: 6,
        heat_number: 1,
        lane: 2,
        time_ms: 77770,
        is_dq: false,
        dq_code: null,
        dq_description: null,
        official_initials: null,
        is_no_show: false,
      }),
    });
    addCheck('Admin edit/save update', response.ok, `status=${response.status} body=${response.body}`);

    response = await request(`/api/admin/meets/${meetId}/results`);
    const rowsAfterEdit = response.ok ? JSON.parse(response.body).results || [] : [];
    const editedRow = rowsAfterEdit.find((row) => row.id === timeNormal?.id);

    addCheck(
      'Admin edit persisted',
      !!editedRow && editedRow.event_number === 6 && editedRow.heat_number === 1 && editedRow.lane === 2 && editedRow.time_ms === 77770 && editedRow.is_dq === 0,
      editedRow
        ? JSON.stringify({ id: editedRow.id, event: editedRow.event_number, heat: editedRow.heat_number, lane: editedRow.lane, time: editedRow.time_ms, is_dq: editedRow.is_dq })
        : 'missing'
    );

    const meetDir = path.join(process.cwd(), 'maestro_data', String(meetId));
    const files = fs.existsSync(meetDir) ? fs.readdirSync(meetDir) : [];
    const hasRevised = files.some((file) => file.includes('-revised.json'));
    const hasTimingConfig = fs.existsSync(path.join(meetDir, 'timing_system_configuration.json'));

    addCheck('Maestro revised file generated', hasRevised, `dir=${meetDir} files=${files.length}`);
    addCheck('Maestro timing config updated', hasTimingConfig, `dir=${meetDir}`);

    response = await request('/api/admin/meets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `QA Meet Secondary ${Date.now()}`, org_id: 1 }),
    });
    const otherMeet = response.ok ? JSON.parse(response.body) : null;

    if (otherMeet?.id) {
      await request('/api/times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meet_id: otherMeet.id,
          event_number: 99,
          heat_number: 1,
          lane: 1,
          time_ms: 12345,
          is_no_show: false,
        }),
      });
    }

    response = await request(`/api/export?meet_id=${meetId}`);
    const csvHasPrimary = response.body.includes(`${meetId},`);
    const csvHasOther = otherMeet?.id ? response.body.includes(`${otherMeet.id},`) : false;
    addCheck('CSV export is meet-scoped', response.ok && csvHasPrimary && !csvHasOther, `status=${response.status}`);

    response = await request(`/api/export/sd3?meet_id=${meetId}`);
    addCheck('SD3 export is meet-scoped endpoint', response.ok && response.body.length > 0, `status=${response.status} bytes=${response.body.length}`);

    if (otherMeet?.id && meet?.access_code && meet?.admin_pin && otherMeet?.access_code && otherMeet?.admin_pin) {
      const primaryDir = path.join(process.cwd(), 'maestro_data', String(meetId));
      const secondaryDir = path.join(process.cwd(), 'maestro_data', String(otherMeet.id));
      fs.mkdirSync(primaryDir, { recursive: true });
      fs.mkdirSync(secondaryDir, { recursive: true });

      const primaryFile = 'session_1_event_11_heat_1_race_1.json';
      const secondaryFile = 'session_1_event_22_heat_1_race_1.json';

      fs.writeFileSync(path.join(primaryDir, primaryFile), JSON.stringify({ lanes: [] }, null, 2));
      fs.writeFileSync(path.join(secondaryDir, secondaryFile), JSON.stringify({ lanes: [] }, null, 2));

      response = await request(`/api/sync/pending-files?access_code=${meet.access_code}&admin_pin=${meet.admin_pin}`);
      const primaryPending = response.ok ? JSON.parse(response.body).pending || [] : [];
      const primaryHasOwn = primaryPending.some((item) => item.filename === primaryFile);
      const primaryHasOther = primaryPending.some((item) => item.filename === secondaryFile);
      addCheck('Sync pending-files scoped (primary)', response.ok && primaryHasOwn && !primaryHasOther, `status=${response.status} count=${primaryPending.length}`);

      response = await request(`/api/sync/pending-files?access_code=${otherMeet.access_code}&admin_pin=${otherMeet.admin_pin}`);
      const secondaryPending = response.ok ? JSON.parse(response.body).pending || [] : [];
      const secondaryHasOwn = secondaryPending.some((item) => item.filename === secondaryFile);
      const secondaryHasOther = secondaryPending.some((item) => item.filename === primaryFile);
      addCheck('Sync pending-files scoped (secondary)', response.ok && secondaryHasOwn && !secondaryHasOther, `status=${response.status} count=${secondaryPending.length}`);

      response = await request('/api/sync/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_code: meet.access_code,
          admin_pin: meet.admin_pin,
          filenames: [primaryFile]
        })
      });
      addCheck('Sync receipt accepted for scoped meet', response.ok, `status=${response.status} body=${response.body}`);
    }

    const passed = checks.filter((check) => check.pass).length;
    console.log(JSON.stringify({ summary: { passed, total: checks.length }, checks }, null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
