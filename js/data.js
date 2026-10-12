/* Deterministic, fictional seed data.
   Every name, ID, policy, campaign and metric here is invented for the demo.
   The same seed always produces the same dataset, so charts and stories are repeatable. */
(function () {
  'use strict';
  const WA = window.WA;
  const { addDays, diffDays, mulberry32, fingerprint, initialsOf } = WA;

  const DEMO_TODAY = '2026-10-12';
  const SCHEMA = 3;
  const DOMAIN = 'waha-demo.example';

  const BUSINESSES = ['Waha Capital', 'Waha Investments', 'Private Investments'];
  const WC = 'Waha Capital', WI = 'Waha Investments', PI = 'Private Investments';

  const DEPARTMENTS = [
    { id: 'BDV', name: 'Business Development', size: 20, head: 'Head of Business Development', mgr: 'Business Development Manager', staff: ['Associate', 'Senior Associate', 'Analyst', 'Investor Relations Associate'] },
    { id: 'FOP', name: 'Fund Operations', size: 32, head: 'Head of Fund Operations', mgr: 'Operations Manager', staff: ['Operations Analyst', 'Settlements Officer', 'Senior Operations Analyst', 'Treasury Analyst'] },
    { id: 'RSK', name: 'Risk Management', size: 24, head: 'Chief Risk Officer', mgr: 'Risk Manager', staff: ['Risk Analyst', 'Senior Risk Analyst', 'Quantitative Analyst', 'Model Validation Analyst'] },
    { id: 'FAD', name: 'Fund Administration', size: 30, head: 'Head of Fund Administration', mgr: 'Fund Accounting Manager', staff: ['Fund Accountant', 'Senior Fund Accountant', 'Investor Services Officer', 'NAV Analyst'] },
    { id: 'FRO', name: 'Front Office', size: 38, head: 'Chief Investment Officer', mgr: 'Portfolio Manager', staff: ['Investment Analyst', 'Trader', 'Senior Investment Analyst', 'Research Associate'] },
    { id: 'CMP', name: 'Compliance', size: 22, head: 'Head of Compliance', mgr: 'Compliance Manager', staff: ['Compliance Officer', 'Senior Compliance Officer', 'AML Analyst', 'Regulatory Reporting Analyst'] },
    { id: 'GRP', name: 'Group Policies', team: 'Group Functions', size: 34, head: 'Group Chief Operating Officer', mgr: 'Group Functions Manager', staff: ['HR Business Partner', 'IT Security Engineer', 'Finance Analyst', 'Legal Counsel', 'Office Administrator'] },
  ];

  const FIRST = ['Ahmed', 'Fatima', 'Khalid', 'Mariam', 'Omar', 'Noura', 'Yousef', 'Aisha', 'Hamad', 'Reem', 'Rashid', 'Hessa', 'Saeed', 'Latifa', 'Faisal', 'Shamma', 'Ali', 'Maitha', 'Sultan', 'Amna',
    'Ravi', 'Anjali', 'Daniel', 'Sophie', 'James', 'Elena', 'Marco', 'Wei', 'Priya', 'Arjun', 'Hannah', 'Lucas', 'Nadia', 'Tariq', 'Zainab', 'Rania', 'Samir', 'Dina', 'Hassan', 'Leila',
    'Yasmin', 'Rohan', 'Meera', 'Thomas', 'Clara', 'Ibrahim', 'Salma', 'George', 'Mona', 'Adel'];
  const LAST = ['Haddad', 'Nasser', 'Mansour', 'Khoury', 'Rahman', 'Saleh', 'Farouk', 'Qasim', 'Hamdan', 'Darwish', 'Aziz', 'Barakat', 'Sabbagh', 'Menon', 'Iyer', 'Pillai', 'Sharma', 'Fernandes', 'Clarke', 'Bennett',
    'Morgan', 'Rossi', 'Novak', 'Lindqvist', 'Tan', 'Lim', 'Okafor', 'Mendes', 'Varga', 'Petrov', 'Hughes', 'Walsh', 'Kapoor', 'Nair', 'Haider', 'Siddiqui', 'Shams', 'Awad', 'Jaber', 'Karam'];

  /* Fixed demo personas (fictional) */
  const PERSONA_PEOPLE = {
    E1001: { name: 'Layla Haddad', dept: 'RSK', title: 'Risk Analyst', role: 'staff' },
    E1002: { name: 'Karim Nasser', dept: 'RSK', title: 'Risk Manager', role: 'manager' },
    E1003: { name: 'Huda Rahman', dept: 'RSK', title: 'Chief Risk Officer', role: 'head' },
    E1004: { name: 'Sara Mansour', dept: 'CMP', title: 'Head of Compliance', role: 'head' },
    E1005: { name: 'Daniel Clarke', dept: 'GRP', title: 'Internal Audit Lead', role: 'staff' },
  };
  const PERSONAS = {
    employee: { key: 'employee', label: 'Employee', userId: 'E1001', blurb: 'Reads and acknowledges assigned policies.' },
    owner: { key: 'owner', label: 'Policy Owner', userId: 'E1004', blurb: 'Publishes policies, runs campaigns, manages exceptions and reports.' },
    manager: { key: 'manager', label: 'Line Manager', userId: 'E1002', blurb: 'Read-only view of the team’s status; receives escalations.' },
    auditor: { key: 'auditor', label: 'Auditor', userId: 'E1005', blurb: 'Read-only access to attestation evidence and reports.' },
  };

  /* [id, title, dept, businesses, owner ('head'|'sara'|dept id), approver, version, uploaded, review|null, status|null, audience ('all'|[dept ids]), attestation required, min read (min), regulatory] */
  const POLICY_ROWS = [
    ['RSK.01', 'Enterprise Risk Management Policy', 'RSK', [WI], 'head', 'Board of Directors', '3.0', '2026-01-19', null, null, 'all', true, 15, false],
    ['RSK.02', 'Market Risk Policy', 'RSK', [WI], 'head', 'Board Risk Committee', '2.1', '2025-11-03', null, null, ['RSK', 'FRO'], true, 10, false],
    ['RSK.03', 'Liquidity Risk Policy', 'RSK', [WI, PI], 'head', 'Board Risk Committee', '1.4', '2024-10-10', '2026-10-16', 'Under Review', ['RSK', 'FOP', 'FAD'], true, 10, false],
    ['RSK.04', 'Operational Risk Policy', 'RSK', [WI], 'head', 'Board Risk Committee', '2.0', '2026-03-02', null, null, 'all', true, 10, false],
    ['RSK.05', 'Counterparty Credit Risk Policy', 'RSK', [WI], 'head', 'Board Risk Committee', '1.2', '2025-06-16', null, null, ['RSK', 'FRO'], true, 8, false],
    ['CMP.01', 'Anti-Money Laundering Policy', 'CMP', [WC, WI, PI], 'sara', 'Board Audit Committee', '4.1', '2026-02-09', null, null, 'all', true, 15, true],
    ['CMP.02', 'Sanctions Compliance Policy', 'CMP', [WC, WI, PI], 'sara', 'Board Audit Committee', '2.0', '2026-09-24', null, null, ['FRO', 'CMP', 'FOP', 'FAD', 'BDV', 'RSK'], true, 10, true],
    ['CMP.03', 'Anti-Bribery and Corruption Policy', 'CMP', [WC, WI, PI], 'sara', 'Board Audit Committee', '2.2', '2025-09-08', null, null, 'all', true, 8, false],
    ['CMP.04', 'Conflicts of Interest Policy', 'CMP', [WC, WI, PI], 'sara', 'Board Audit Committee', '3.0', '2025-12-01', null, null, 'all', true, 8, false],
    ['CMP.05', 'Personal Account Dealing Policy', 'CMP', [WI], 'sara', 'Board Audit Committee', '2.3', '2026-09-24', null, null, ['FRO', 'CMP', 'RSK', 'FOP'], true, 8, true],
    ['CMP.06', 'Market Abuse and Insider Dealing Policy', 'CMP', [WI, PI], 'sara', 'Board Audit Committee', '1.5', '2026-09-24', null, null, ['FRO', 'CMP', 'RSK', 'FOP'], true, 12, true],
    ['GRP.01', 'Code of Conduct', 'GRP', [WC, WI, PI], 'sara', 'Board of Directors', '5.0', '2026-01-12', null, null, 'all', true, 15, false],
    ['GRP.02', 'Employee Code of Ethics', 'GRP', [WC, WI, PI], 'head', 'Board of Directors', '3.1', '2025-12-15', null, null, 'all', true, 10, false],
    ['GRP.03', 'Corporate Governance Manual', 'GRP', [WC, WI, PI], 'head', 'Board of Directors', '6.0', '2026-04-20', null, null, 'all', true, 20, false],
    ['GRP.04', 'Whistleblowing Policy and Procedures', 'GRP', [WC, WI, PI], 'sara', 'Board Audit Committee', '2.4', '2026-03-16', null, null, 'all', true, 8, false],
    ['GRP.05', 'Information Security Policy', 'GRP', [WC, WI, PI], 'head', 'Executive Committee', '4.0', '2026-09-28', null, null, 'all', true, 12, false],
    ['GRP.06', 'Data Protection Policy', 'GRP', [WC, WI, PI], 'sara', 'Executive Committee', '3.0', '2026-02-23', null, null, 'all', true, 10, true],
    ['GRP.07', 'Records Management Policy', 'GRP', [WC, WI, PI], 'head', 'Executive Committee', '1.6', '2024-09-30', '2026-09-30', 'Under Review', 'all', true, 8, false],
    ['GRP.08', 'Business Continuity Policy', 'GRP', [WC, WI, PI], 'head', 'Executive Committee', '2.2', '2025-08-18', null, null, 'all', true, 8, false],
    ['GRP.09', 'Acceptable Use of IT Policy', 'GRP', [WC, WI, PI], 'head', 'Executive Committee', '2.0', '2025-10-06', null, null, 'all', true, 6, false],
    ['GRP.10', 'Health and Safety Policy', 'GRP', [WC, WI, PI], 'head', 'Executive Committee', '1.3', '2025-05-12', null, null, 'all', false, 5, false],
    ['GRP.11', 'Social Media Policy', 'GRP', [WC, WI, PI], 'head', 'Executive Committee', '1.1', '2024-10-01', '2026-10-01', null, 'all', true, 5, false],
    ['FOP.01', 'Trade Settlement Procedure', 'FOP', [WI], 'head', 'Executive Committee', '2.0', '2025-11-17', null, null, ['FOP'], true, 8, false],
    ['FOP.02', 'Valuation Policy', 'FOP', [WI, PI], 'head', 'Board Audit Committee', '3.2', '2024-11-05', '2026-11-05', null, ['FOP', 'FAD', 'RSK'], true, 12, false],
    ['FOP.03', 'Cash Management Procedure', 'FOP', [WI], 'head', 'Executive Committee', '1.8', '2026-05-25', null, null, ['FOP', 'FAD'], true, 6, false],
    ['FOP.04', 'Reconciliation Procedure', 'FOP', [WI], 'head', 'Executive Committee', '1.1', '2025-07-07', null, null, ['FOP'], false, 5, false],
    ['FAD.01', 'NAV Calculation Procedure', 'FAD', [WI], 'head', 'Executive Committee', '2.5', '2026-06-08', null, null, ['FAD'], true, 10, false],
    ['FAD.02', 'Investor Onboarding (KYC) Procedure', 'FAD', [WI, PI], 'head', 'Board Audit Committee', '3.0', '2026-04-06', null, null, ['FAD', 'BDV', 'CMP'], true, 10, true],
    ['FAD.03', 'Fund Expense Allocation Policy', 'FAD', [WI], 'head', 'Executive Committee', '1.0', '2025-03-10', null, null, ['FAD'], false, 5, false],
    ['FRO.01', 'Best Execution Policy', 'FRO', [WI], 'head', 'Board Risk Committee', '2.1', '2024-11-28', '2026-11-28', null, ['FRO'], true, 10, true],
    ['FRO.02', 'Order Handling and Allocation Policy', 'FRO', [WI], 'head', 'Board Risk Committee', '1.7', '2026-02-02', null, null, ['FRO'], true, 8, false],
    ['FRO.03', 'Research and Communications Policy', 'FRO', [WI, PI], 'head', 'Executive Committee', '0.9', '2026-10-05', null, 'Draft', ['FRO', 'BDV'], true, 6, false],
    ['BDV.01', 'Client Due Diligence Procedure', 'BDV', [WI, PI], 'head', 'Board Audit Committee', '1.5', '2025-09-22', null, null, ['BDV', 'FAD'], true, 8, false],
    ['BDV.02', 'Marketing and Financial Promotions Policy', 'BDV', [WI, PI], 'head', 'Executive Committee', '1.2', '2026-01-26', null, null, ['BDV', 'FRO'], true, 6, false],
    ['BDV.03', 'Gifts and Hospitality Policy', 'BDV', [WC, WI, PI], 'sara', 'Board Audit Committee', '2.0', '2024-12-08', '2026-12-08', null, 'all', true, 6, false],
  ];

  const NEW_JOINER_DATES = ['2026-09-14', '2026-09-16', '2026-09-21', '2026-09-28', '2026-10-01', '2026-10-05', '2026-10-07', '2026-10-09'];

  const DEFAULT_SETTINGS = {
    windowDays: 14,
    reminderDays: [5, 10, 13],
    escalationDays: [15, 21, 28],
    weeklyAfterDays: 7,
    demoReadSeconds: 10,
    retentionYears: 7,
  };

  /* ---------- version history ---------- */
  function versionHistory(id, version, uploaded, approver) {
    const [maj, min] = version.split('.').map(Number);
    const list = [];
    if (maj === 0) {
      list.push({ version, date: uploaded, note: 'Initial draft for consultation', major: true });
    } else {
      const majors = [];
      for (let m = 1; m <= maj; m++) majors.push(`${m}.0`);
      if (min > 0) majors.push(version);
      const n = majors.length;
      majors.forEach((v, i) => {
        const back = (n - 1 - i) * 400 + (i === n - 1 ? 0 : 35);
        const date = addDays(uploaded, -back);
        const isMinor = !v.endsWith('.0');
        list.push({
          version: v, date,
          note: i === 0 ? 'Initial approved version' : isMinor ? 'Minor clarifications and formatting updates' : 'Periodic review: substantive changes approved by ' + approver,
          major: !isMinor,
        });
      });
    }
    return list.map((v) => ({ ...v, hash: fingerprint(id + '@' + v.version), file: `${id}_v${v.version}.pdf` }));
  }

  /* ---------- seed builder ---------- */
  function build() {
    const rnd = mulberry32(20261012);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));

    const departments = DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, team: d.team || d.name, headId: null }));
    const employees = [];
    const usedNames = new Set(Object.values(PERSONA_PEOPLE).map((p) => p.name));
    let seq = 1006;
    const genName = () => {
      for (;;) {
        const n = `${pick(FIRST)} ${pick(LAST)}`;
        if (!usedNames.has(n)) { usedNames.add(n); return n; }
      }
    };
    const joinDate = () => addDays('2012-01-15', between(0, diffDays('2026-08-31', '2012-01-15')));
    const bizFor = (deptId, i) => (deptId === 'GRP' ? WC : (deptId === 'FRO' || deptId === 'BDV') && i % 2 === 1 ? PI : WI);
    const mk = (id, name, deptId, title, managerId, i) => {
      const e = {
        id, name, deptId, title, managerId, business: bizFor(deptId, i),
        email: `${name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ +/g, '.')}@${DOMAIN}`,
        joinDate: joinDate(), status: 'Active',
      };
      employees.push(e);
      return e;
    };

    DEPARTMENTS.forEach((d) => {
      const fixedHead = Object.entries(PERSONA_PEOPLE).find(([, p]) => p.dept === d.id && p.role === 'head');
      const head = fixedHead ? mk(fixedHead[0], fixedHead[1].name, d.id, fixedHead[1].title, null, 0) : mk(`E${seq++}`, genName(), d.id, d.head, null, 0);
      departments.find((x) => x.id === d.id).headId = head.id;
      const managers = [];
      for (let m = 0; m < 2; m++) {
        const fixedMgr = d.id === 'RSK' && m === 0 ? ['E1002', PERSONA_PEOPLE.E1002] : null;
        managers.push(fixedMgr ? mk(fixedMgr[0], fixedMgr[1].name, d.id, fixedMgr[1].title, head.id, m) : mk(`E${seq++}`, genName(), d.id, m === 0 ? d.mgr : 'Senior ' + d.mgr, head.id, m + 1));
      }
      const staffCount = d.size - 3;
      for (let s = 0; s < staffCount; s++) {
        const mgr = managers[s % 2];
        if (d.id === 'RSK' && s === 0) mk('E1001', PERSONA_PEOPLE.E1001.name, d.id, PERSONA_PEOPLE.E1001.title, mgr.id, s);
        else if (d.id === 'GRP' && s === 0) mk('E1005', PERSONA_PEOPLE.E1005.name, d.id, PERSONA_PEOPLE.E1005.title, mgr.id, s);
        else mk(`E${seq++}`, genName(), d.id, pick(d.staff), mgr.id, s);
      }
    });
    // fixed join dates for personas, plus eight recent joiners (never personas, never Risk so the ad hoc campaign stays clean)
    employees.find((e) => e.id === 'E1001').joinDate = '2022-03-06';
    employees.find((e) => e.id === 'E1002').joinDate = '2019-08-18';
    const joinerPool = employees.filter((e) => !PERSONA_PEOPLE[e.id] && e.deptId !== 'RSK' && e.managerId && e.title !== undefined && !/Manager|Head|Chief/.test(e.title));
    const step = Math.floor(joinerPool.length / NEW_JOINER_DATES.length);
    NEW_JOINER_DATES.forEach((d, i) => { joinerPool[i * step + 3].joinDate = d; });

    const headOf = (deptId) => departments.find((d) => d.id === deptId).headId;

    /* policies */
    const policies = POLICY_ROWS.map((r) => {
      const [id, title, deptId, businesses, ownerKey, approver, version, uploaded, review, status, audience, attestation, minRead, regulatory] = r;
      const ownerId = ownerKey === 'sara' ? 'E1004' : headOf(ownerKey === 'head' ? deptId : ownerKey);
      const versions = versionHistory(id, version, uploaded, approver);
      const effective = status === 'Draft' ? null : addDays(uploaded, 7);
      let reviewDate = review || addDays(uploaded, 730);
      if (!review && diffDays(reviewDate, DEMO_TODAY) < 75) reviewDate = addDays(reviewDate, 365);
      return {
        id, title, deptId, businesses, ownerId, approver, version,
        created: versions[0].date, uploaded, effective, review: reviewDate,
        status: status || 'Published', attestation, minRead, regulatory,
        audience: audience === 'all' ? { type: 'all', values: [] } : { type: 'department', values: audience },
        versions, lastReviewed: addDays(uploaded, -14), draft: null,
      };
    });
    const pol = Object.fromEntries(policies.map((p) => [p.id, p]));

    /* campaigns */
    const campaigns = [
      { id: 'CMP-2026-001', name: 'Annual Policy Attestation 2026', type: 'Annual', description: 'Yearly re-attestation of the core conduct, security and compliance policies by all in-scope employees.',
        items: [['GRP.01', '5.0'], ['GRP.02', '3.1'], ['GRP.05', '3.2'], ['GRP.06', '3.0'], ['GRP.04', '2.4'], ['CMP.01', '4.1']],
        audience: { type: 'all', values: [] }, launch: '2026-09-21', due: '2026-10-05', status: 'Active', ownerId: 'E1004', createdAt: '2026-09-17T07:30:00Z' },
      { id: 'CMP-2026-002', name: 'Information Security Policy Update', type: 'Policy update', description: 'Re-attestation required following publication of Information Security Policy v4.0 (major version).',
        items: [['GRP.05', '4.0']], audience: { type: 'all', values: [] }, launch: '2026-10-01', due: '2026-10-15', status: 'Active', ownerId: headOf('GRP'), createdAt: '2026-09-29T09:10:00Z' },
      { id: 'CMP-2026-003', name: 'Regulatory Compliance Attestation', type: 'Regulatory change', description: 'Targeted attestation after regulatory updates to market conduct and sanctions requirements (fictional scenario).',
        items: [['CMP.06', '1.5'], ['CMP.02', '2.0'], ['CMP.05', '2.3']], audience: { type: 'department', values: ['FRO', 'CMP', 'RSK', 'FOP'] }, launch: '2026-10-06', due: '2026-10-20', status: 'Active', ownerId: 'E1004', createdAt: '2026-10-05T11:45:00Z' },
      { id: 'CMP-2026-004', name: 'New Joiner Policy Assignment', type: 'New joiner', description: 'Rolling campaign: new joiners detected in Entra ID receive the core policy pack from day one, due within 14 days.',
        items: [['GRP.01', '5.0'], ['GRP.02', '3.1'], ['GRP.04', '2.4'], ['GRP.06', '3.0'], ['CMP.01', '4.1'], ['CMP.03', '2.2']], audience: { type: 'rule', values: [], label: 'New joiners detected in Entra ID (rolling)' },
        launch: '2026-01-01', due: null, status: 'Active', rolling: true, ownerId: 'E1004', createdAt: '2025-12-20T08:00:00Z' },
      { id: 'CMP-2026-005', name: 'Risk Framework Refresh', type: 'Exception / ad hoc', description: 'Ad hoc attestation for the Risk Management team after the ERM framework refresh.',
        items: [['RSK.01', '3.0'], ['RSK.04', '2.0']], audience: { type: 'department', values: ['RSK'] }, launch: '2026-08-24', due: '2026-09-07', status: 'Closed', ownerId: 'E1003', createdAt: '2026-08-20T10:00:00Z', closedAt: '2026-09-30' },
      { id: 'CMP-2026-006', name: 'Q4 Front Office Conduct Refresh', type: 'Exception / ad hoc', description: 'Scheduled refresher on execution and order-handling policies for the Front Office.',
        items: [['FRO.01', '2.1'], ['FRO.02', '1.7']], audience: { type: 'department', values: ['FRO'] }, launch: '2026-11-02', due: '2026-11-16', status: 'Scheduled', ownerId: 'E1004', createdAt: '2026-10-08T12:00:00Z' },
    ];

    /* assignments */
    const assignments = [];
    const events = [];
    let aSeq = 1;
    let evSeq = 1;
    const ev = (ts, type, actorId, detail, refs) => events.push({ id: `EV-${String(evSeq++).padStart(6, '0')}`, ts, type, actorId, detail, ...(refs || {}) });
    const deptFactor = { BDV: 0.93, FOP: 0.98, RSK: 1.0, FAD: 1.0, FRO: 0.82, CMP: 1.02, GRP: 0.9 };
    const exemptReasons = ['Extended medical leave during the campaign window', 'Secondment to portfolio company — attested under host entity policy', 'Maternity leave — will attest on return'];
    const extendReasons = ['Annual leave during campaign window', 'Business travel — extension approved by line manager', 'Medical leave — short extension granted'];
    const tsOn = (date, hourGST, minute) => `${date}T${String(hourGST - 4).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(between(0, 59)).padStart(2, '0')}Z`;
    const ref = (date) => `ACK-${date.replace(/-/g, '')}-${Math.floor(rnd() * 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`;

    function makeAssignment(c, e, pid, ver, assigned, due) {
      const a = {
        id: `ATT-${String(aSeq++).padStart(6, '0')}`, campaignId: c.id, employeeId: e.id, policyId: pid, version: ver,
        assigned, due, status: 'Pending', openedAt: null, ackAt: null, receipt: null, initials: null, channel: null, readSeconds: null,
        outcome: null, reason: null, escManual: 0, sim: 0, originalDue: null,
      };
      assignments.push(a);
      return a;
    }
    function acknowledge(a, e, ackDate) {
      const h = between(8, 18), m = between(0, 59);
      a.status = 'Acknowledged';
      a.openedAt = tsOn(ackDate, h, Math.max(0, m - 9));
      a.ackAt = tsOn(ackDate, h, m);
      a.receipt = ref(ackDate);
      a.initials = initialsOf(e.name);
      a.channel = rnd() < 0.72 ? 'Portal' : 'Teams';
      a.readSeconds = between(180, 960);
      a.outcome = diffDays(ackDate, a.due) > 0 ? 'Acknowledged late' : 'On time';
    }
    function openOnly(a, date) { a.status = 'In Progress'; a.openedAt = tsOn(date, between(8, 17), between(0, 59)); }

    const active = employees.filter((e) => e.status === 'Active');
    const audienceOf = (c) => {
      if (c.audience.type === 'all') return active.filter((e) => e.joinDate < c.launch);
      if (c.audience.type === 'department') return active.filter((e) => c.audience.values.includes(e.deptId) && e.joinDate < c.launch);
      return [];
    };

    campaigns.forEach((c) => {
      if (c.status === 'Scheduled') return;
      if (c.rolling) {
        active.filter((e) => e.joinDate >= '2026-09-01').forEach((e) => {
          const assigned = e.joinDate, due = addDays(assigned, 14), elapsed = diffDays(DEMO_TODAY, assigned);
          c.items.forEach(([pid, ver]) => {
            const a = makeAssignment(c, e, pid, ver, assigned, due);
            const r = rnd();
            if (elapsed > 14 ? r < 0.8 : r < (elapsed / 14) * 0.75) acknowledge(a, e, addDays(assigned, Math.min(elapsed, between(1, Math.max(1, Math.min(elapsed, 16))))));
            else if (rnd() < 0.3 && elapsed > 0) openOnly(a, addDays(assigned, between(0, Math.min(elapsed, 5))));
          });
        });
        return;
      }
      const day = diffDays(DEMO_TODAY, c.launch);
      audienceOf(c).forEach((e) => {
        const f = deptFactor[e.deptId] || 1;
        c.items.forEach(([pid, ver]) => {
          const a = makeAssignment(c, e, pid, ver, c.launch, c.due);
          const r = rnd();
          if (c.id === 'CMP-2026-001') {
            if (r < 0.86 * f) {
              const late = rnd() < 0.08;
              acknowledge(a, e, addDays(c.launch, late ? between(15, 20) : Math.min(13, Math.floor(Math.pow(rnd(), 1.8) * 14))));
            } else {
              const r3 = rnd();
              if (r3 < 0.1) { a.status = 'Exempted'; a.outcome = 'Exempted'; a.reason = pick(exemptReasons); a.closedAt = tsOn(addDays(c.launch, between(3, 12)), 10, 15); }
              else if (r3 < 0.22) { a.originalDue = a.due; a.due = '2026-10-19'; a.outcome = 'Extended'; a.reason = pick(extendReasons); }
              else if (r3 < 0.45) openOnly(a, addDays(c.launch, between(1, 18)));
            }
          } else if (c.id === 'CMP-2026-002') {
            if (r < 0.6 * f) acknowledge(a, e, addDays(c.launch, Math.floor(Math.pow(rnd(), 1.4) * (day + 1))));
            else if (rnd() < 0.3) openOnly(a, addDays(c.launch, between(0, day)));
          } else if (c.id === 'CMP-2026-003') {
            if (r < 0.36 * f) acknowledge(a, e, addDays(c.launch, Math.floor(rnd() * (day + 1))));
            else if (rnd() < 0.25) openOnly(a, addDays(c.launch, between(0, day)));
          } else if (c.id === 'CMP-2026-005') {
            if (r < 0.9) acknowledge(a, e, addDays(c.launch, between(0, 12)));
            else if (r < 0.95) acknowledge(a, e, addDays(c.launch, between(15, 24)));
            else { a.status = 'Exempted'; a.outcome = 'Exempted'; a.reason = 'Parental leave for the full campaign window'; a.closedAt = tsOn('2026-09-10', 11, 20); }
          }
        });
      });
    });

    /* persona storylines (deterministic overrides) */
    const layla = employees.find((e) => e.id === 'E1001');
    const find = (cid, pid) => assignments.find((a) => a.campaignId === cid && a.employeeId === 'E1001' && a.policyId === pid);
    const reset = (a) => Object.assign(a, { status: 'Pending', openedAt: null, ackAt: null, receipt: null, initials: null, channel: null, readSeconds: null, outcome: null, reason: null, closedAt: null, originalDue: null, due: a.originalDue || a.due });
    [['GRP.01', '2026-09-22'], ['GRP.02', '2026-09-22'], ['GRP.05', '2026-09-24'], ['GRP.06', '2026-09-25'], ['CMP.01', '2026-09-29']].forEach(([pid, d]) => { const a = find('CMP-2026-001', pid); reset(a); acknowledge(a, layla, d); });
    reset(find('CMP-2026-001', 'GRP.04'));
    reset(find('CMP-2026-002', 'GRP.05'));
    const mad = find('CMP-2026-003', 'CMP.06'); reset(mad); openOnly(mad, '2026-10-09');
    reset(find('CMP-2026-003', 'CMP.02'));
    reset(find('CMP-2026-003', 'CMP.05'));
    ['RSK.01', 'RSK.04'].forEach((pid, i) => { const a = find('CMP-2026-005', pid); reset(a); acknowledge(a, layla, i ? '2026-08-27' : '2026-08-26'); });

    /* a few closed-campaign outcomes for the audit story */
    const ermOpen = assignments.filter((a) => a.campaignId === 'CMP-2026-005' && a.employeeId !== 'E1001' && a.status === 'Acknowledged' && a.outcome === 'On time');
    if (ermOpen[5]) { const a = ermOpen[5]; reset(a); a.status = 'Non-compliant'; a.outcome = 'Non-compliant'; a.reason = 'No acknowledgement after stage 3 escalation; recorded for HR review (fictional)'; a.closedAt = '2026-09-30T08:00:00Z'; }

    /* events (activity history) */
    campaigns.forEach((c) => {
      ev(c.createdAt, 'campaign.created', c.ownerId, `Campaign "${c.name}" created`, { campaignId: c.id });
      if (c.status !== 'Scheduled' && !c.rolling) ev(`${c.launch}T04:00:00Z`, 'campaign.launched', c.ownerId, `Campaign "${c.name}" launched — ${assignments.filter((a) => a.campaignId === c.id).length} assignments created; email and Teams notices queued (simulated)`, { campaignId: c.id });
      if (c.status === 'Closed') ev(`${c.closedAt}T09:00:00Z`, 'campaign.closed', c.ownerId, `Campaign "${c.name}" closed and evidence pack generated`, { campaignId: c.id });
    });
    policies.forEach((p) => {
      const v = p.versions[p.versions.length - 1];
      if (v.date >= '2026-01-01') ev(`${v.date}T06:30:00Z`, 'policy.published', p.ownerId, `${p.id} ${p.title} v${v.version} published (fingerprint recorded)`, { policyId: p.id });
    });
    assignments.forEach((a) => {
      if (a.outcome === 'Exempted') ev(a.closedAt || `${a.assigned}T08:00:00Z`, 'assignment.exempted', 'E1004', `Exemption recorded: ${a.reason}`, { assignmentId: a.id, employeeId: a.employeeId, policyId: a.policyId, campaignId: a.campaignId });
      if (a.outcome === 'Extended') ev(`2026-10-03T07:20:00Z`, 'assignment.extended', 'E1004', `Due date extended from ${a.originalDue} to ${a.due}: ${a.reason}`, { assignmentId: a.id, employeeId: a.employeeId, policyId: a.policyId, campaignId: a.campaignId });
      if (a.outcome === 'Non-compliant') ev(a.closedAt, 'assignment.noncompliant', 'E1003', `Non-compliance recorded: ${a.reason}`, { assignmentId: a.id, employeeId: a.employeeId, policyId: a.policyId, campaignId: a.campaignId });
    });
    const annualOverdue = assignments.filter((a) => a.campaignId === 'CMP-2026-001' && !['Acknowledged', 'Exempted'].includes(a.status) && a.due < DEMO_TODAY).length;
    ev('2026-10-06T03:00:00Z', 'workflow.run', 'SYSTEM', 'Scheduled flow (simulated): stage 1 escalations sent to line managers for overdue Annual Policy Attestation items', { campaignId: 'CMP-2026-001' });
    ev('2026-10-12T03:00:00Z', 'workflow.run', 'SYSTEM', `Scheduled flow (simulated): stage 2 escalation — ${annualOverdue} overdue items added to overdue register and sent to policy owners`, { campaignId: 'CMP-2026-001' });
    ev('2026-10-12T03:05:00Z', 'review.alert', 'SYSTEM', 'Review alerts (simulated): RSK.03 Liquidity Risk Policy review due in 4 days; GRP.07 and GRP.11 past review date', {});
    ev('2026-10-09T05:00:00Z', 'joiner.detected', 'SYSTEM', 'Entra ID sync (simulated): new joiner detected and core policy pack assigned', { campaignId: 'CMP-2026-004' });
    events.sort((x, y) => (x.ts < y.ts ? -1 : 1));

    /* notifications for the persona users */
    const notifications = [];
    let nSeq = 1;
    const note = (to, ts, kind, channel, subject, body, link) => notifications.push({ id: `NT-${String(nSeq++).padStart(6, '0')}`, to, ts, kind, channel, subject, body, link: link || null, read: false });
    const wb = find('CMP-2026-001', 'GRP.04');
    note('E1001', '2026-09-21T04:05:00Z', 'notify', 'Email & Teams', 'Action required: 6 policies to acknowledge by 5 Oct 2026', 'Annual Policy Attestation 2026 has been assigned to you. Open the Attestation Centre to read and acknowledge each policy.', '#/attestation');
    note('E1001', '2026-10-04T04:00:00Z', 'reminder', 'Email & Teams', 'Reminder: Whistleblowing Policy and Procedures is due tomorrow', 'Day 13 reminder (simulated). Please read and acknowledge before the due date.', `#/read/${wb.id}`);
    note('E1001', '2026-10-01T04:05:00Z', 'notify', 'Email & Teams', 'New version: Information Security Policy v4.0 requires your acknowledgement', 'A major version was published. Please acknowledge by 15 Oct 2026.', '#/attestation');
    note('E1001', '2026-10-06T04:00:00Z', 'escalation', 'Email & Teams', 'Overdue: Whistleblowing Policy and Procedures (copied to your line manager)', 'Stage 1 escalation (simulated). Your acknowledgement is overdue; Karim Nasser has been copied.', `#/read/${wb.id}`);
    note('E1001', '2026-10-06T04:10:00Z', 'notify', 'Email & Teams', 'Action required: 3 regulatory policies due 20 Oct 2026', 'Regulatory Compliance Attestation has been assigned to you.', '#/attestation');
    note('E1001', '2026-10-11T04:00:00Z', 'reminder', 'Teams', 'Reminder: Information Security Policy v4.0 is due in 4 days', 'Day 10 reminder (simulated).', '#/attestation');
    note('E1001', '2026-10-12T03:00:00Z', 'escalation', 'Email & Teams', 'Second notice: Whistleblowing Policy and Procedures is 7 days overdue', 'Stage 2 escalation (simulated). The item is now on the overdue register.', `#/read/${wb.id}`);
    note('E1001', find('CMP-2026-001', 'CMP.01').ackAt, 'receipt', 'Email', 'Receipt: Anti-Money Laundering Policy v4.1 acknowledged', `Reference ${find('CMP-2026-001', 'CMP.01').receipt}. Your acknowledgement has been recorded.`, '#/my-policies');
    const karimTeamOverdue = assignments.filter((a) => employees.find((e) => e.id === a.employeeId).managerId === 'E1002' && a.campaignId === 'CMP-2026-001' && !['Acknowledged', 'Exempted'].includes(a.status) && a.due < DEMO_TODAY);
    note('E1002', '2026-10-06T04:00:00Z', 'escalation', 'Email & Teams', `Escalation: ${karimTeamOverdue.length} overdue acknowledgements in your team`, 'Stage 1 escalation (simulated). Members of your team have not acknowledged Annual Policy Attestation 2026 items.', '#/team');
    note('E1002', '2026-10-12T03:00:00Z', 'escalation', 'Email', 'Second notice: overdue items remain in your team', 'Stage 2 escalation (simulated). Items have been added to the overdue register and copied to the policy owner.', '#/team');
    note('E1002', '2026-10-12T05:00:00Z', 'notify', 'Teams', 'Weekly digest: team completion 87% across active campaigns', 'Daily/weekly digest (simulated).', '#/team');
    note('E1004', '2026-10-12T03:00:00Z', 'escalation', 'Email & Teams', `Overdue register: ${annualOverdue} items reached stage 2 escalation`, 'Annual Policy Attestation 2026 — review the overdue register and record outcomes (simulated).', '#/campaigns/CMP-2026-001');
    note('E1004', '2026-10-12T03:05:00Z', 'review', 'Email', 'Review alerts: 1 policy due within 7 days, 2 past review date', 'RSK.03 due 16 Oct 2026; GRP.07 and GRP.11 have lapsed (simulated alerts at 60, 30 and 7 days).', '#/reviews');
    note('E1004', '2026-10-09T05:00:00Z', 'notify', 'Teams', 'New joiner detected: core policy pack assigned', 'Entra ID sync (simulated) created assignments for a new joiner.', '#/campaigns/CMP-2026-004');
    note('E1004', '2026-10-08T12:00:00Z', 'notify', 'Email', 'Campaign scheduled: Q4 Front Office Conduct Refresh launches 2 Nov 2026', 'The campaign will launch automatically on the scheduled date (simulated).', '#/campaigns/CMP-2026-006');
    note('E1005', '2026-10-01T06:00:00Z', 'notify', 'Email', 'Read-only evidence access granted (simulated)', 'You have read-only access to attestation evidence for the 2026 audit cycle.', '#/audit');
    note('E1005', '2026-09-30T09:00:00Z', 'notify', 'Email', 'Evidence pack ready: Risk Framework Refresh', 'The closed campaign evidence pack is available for review.', '#/audit');
    // mark older ones read so the badge count stays meaningful
    notifications.forEach((n) => { if (n.ts < '2026-10-06') n.read = true; });

    return {
      schema: SCHEMA,
      generatedAt: new Date().toISOString(),
      today: DEMO_TODAY,
      settings: { ...DEFAULT_SETTINGS },
      session: { persona: 'employee', recentSearches: ['risk', 'whistleblowing'], recentViewed: ['GRP.03', 'GRP.04'], guideDone: [] },
      businesses: BUSINESSES.slice(),
      departments, employees, policies, campaigns, assignments, events, notifications,
      seq: { assignment: aSeq, event: evSeq, notification: nSeq, employee: seq, campaign: 7 },
    };
  }

  /* ---------- fictional policy text (generated on demand, never stored) ---------- */
  const STATEMENTS = [
    'All activities within the scope of this policy must be carried out in accordance with applicable laws, regulations and the Group’s risk appetite.',
    'Employees must identify, assess and report matters relevant to this policy promptly through the channels defined below.',
    'Exceptions to this policy require prior written approval from the policy owner and must be recorded in the exceptions register with a rationale and expiry date.',
    'Line managers are responsible for ensuring that their teams understand and apply this policy in day-to-day activities.',
    'Records evidencing compliance with this policy must be retained for the period defined in the Records Management Policy.',
    'Any suspected breach must be escalated without delay; retaliation against anyone raising a concern in good faith is prohibited.',
    'Third parties acting on behalf of the Group must be made aware of the relevant requirements of this policy through contractual terms.',
    'Training on the requirements of this policy is provided at induction and refreshed periodically according to role-based risk.',
    'Management information on adherence to this policy is reported to the relevant committee at least annually.',
    'Where this policy conflicts with local regulation, the stricter requirement applies and the policy owner must be informed.',
  ];
  const TOPIC_SPECIFIC = {
    'RSK.01': ['Risks are identified, assessed, mitigated and monitored using the three lines of defence model.', 'Risk appetite statements are approved by the Board and cascaded into measurable limits and key risk indicators.', 'Material risk events must be logged in the risk register within two business days.'],
    'CMP.01': ['Customer due diligence must be completed before any business relationship is established.', 'Suspicious activity must be reported to the MLRO immediately and never disclosed to the subject (“tipping off”).', 'Enhanced due diligence applies to higher-risk relationships, including politically exposed persons.'],
    'GRP.05': ['Information assets are classified and protected according to their classification level.', 'Multi-factor authentication is mandatory for all remote and privileged access.', 'Security incidents, including suspected phishing, must be reported to the IT Service Desk immediately.'],
    'GRP.01': ['Employees act with integrity, fairness and respect in all dealings with colleagues, clients and counterparties.', 'Conflicts of interest must be declared and managed in line with the Conflicts of Interest Policy.', 'Confidential information may only be used for the purpose for which it was provided.'],
    'GRP.04': ['Concerns may be raised in confidence through the independent reporting channel, anonymously if preferred.', 'All reports are acknowledged within five business days and investigated independently.', 'The identity of a whistleblower is protected and any form of retaliation is a disciplinary offence.'],
    'GRP.06': ['Personal data is processed lawfully, fairly and only for specified, explicit purposes.', 'Data subject requests must be forwarded to the Data Protection Officer within one business day.', 'Personal data breaches must be reported internally without undue delay.'],
  };
  function policyContent(p, deptName, ownerName) {
    const topic = p.title.replace(/\b(Policy and Procedures|Policy|Procedure|Manual)\b/g, '').trim().toLowerCase() || p.title.toLowerCase();
    const r = mulberry32(WA.hashString(p.id + p.version));
    const picks = STATEMENTS.slice().sort(() => r() - 0.5).slice(0, 6);
    const specific = TOPIC_SPECIFIC[p.id] || [];
    const scope = p.audience && p.audience.type === 'all' ? 'all employees, contractors and temporary staff of the Group' : `employees in the following teams: ${(p.audience.values || []).join(', ')}`;
    return [
      { h: '1. Purpose', p: [`This ${p.title} sets out the principles and minimum standards that the Group applies to ${topic}. It supports sound governance, protects the Group’s reputation and helps employees make consistent decisions.`, 'This document is fictional sample content created for a software demonstration. It is not, and does not paraphrase, any actual Waha Capital policy.'] },
      { h: '2. Scope', p: [`This policy applies to ${scope}. It covers activities performed on the Group’s premises, remotely, and on behalf of the Group with third parties.`, 'Portfolio companies and joint ventures may adopt equivalent standards approved by their own boards.'] },
      { h: '3. Definitions', list: [`“Policy owner” — ${ownerName}, accountable for maintaining and interpreting this policy.`, '“Attestation” — a recorded confirmation that an employee has read, understood and will comply with a specific policy version.', '“Exception” — an approved, time-bound deviation from a requirement of this policy.', `“Department” — ${deptName}, the function responsible for operating the controls described here.`] },
      { h: '4. Policy statements', list: specific.concat(picks) },
      { h: '5. Roles and responsibilities', list: ['The Board (or delegated committee) approves this policy and material changes to it.', 'The policy owner maintains the policy, monitors adherence and reports exceptions.', 'Line managers ensure their teams complete required attestations and training on time.', 'Employees read, understand and comply with this policy and raise questions with the policy owner.'] },
      { h: '6. Attestation requirements', p: [`Employees in scope must read and acknowledge this policy when it is assigned to them, normally within 14 days. A minimum reading time of ${p.minRead} minutes applies in production. Acknowledgements are recorded with the policy version, a server timestamp and a receipt reference.`, 'Overdue acknowledgements are escalated to the line manager, the policy owner and the department head in accordance with the attestation workflow.'] },
      { h: '7. Breaches and non-compliance', p: ['Failure to comply with this policy may result in disciplinary action in line with the Group’s HR procedures. The attestation solution records non-compliance; decisions on any action remain with the Group.'] },
      { h: '8. Review', p: [`This policy is reviewed at least every two years, or sooner following material regulatory or business change. The next scheduled review is ${WA.fmtDate(p.review, 'long')}.`] },
      { h: '9. Document control', p: [`Version ${p.version} · Approved by ${p.approver} · Owner: ${ownerName} · Department: ${deptName}.`] },
    ];
  }

  WA.data = { DEMO_TODAY, SCHEMA, PERSONAS, DEPARTMENTS, BUSINESSES, DEFAULT_SETTINGS, build, policyContent, versionHistory };
})();
