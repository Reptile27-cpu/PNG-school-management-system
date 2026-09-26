function doGet(e) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName('Students');

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Students sheet was not found.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data.shift().map(header => String(header).trim());

  const requestedEmail = String(e?.parameter?.email || '').trim().toLowerCase();
  const requestedStudentId = String(e?.parameter?.student_id || '').trim();

  const students = data
    .filter(row => row.some(value => value !== ''))
    .map(row => {
      const student = {};
      headers.forEach((header, index) => {
        student[header] = row[index];
      });
      delete student.password;
      return student;
    })
    .filter(student =>
      (!requestedEmail || String(student.email || '').trim().toLowerCase() === requestedEmail) &&
      (!requestedStudentId || String(student.student_id || '').trim() === requestedStudentId)
    );

  return ContentService
    .createTextOutput(JSON.stringify(students))
    .setMimeType(ContentService.MimeType.JSON);
}

function json(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents || '{}');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Students');
    if (!sheet) return json({ error: 'Students sheet was not found.' });

    const values = sheet.getDataRange().getValues();
    const headers = values.shift().map(header => String(header).trim());
    const column = name => headers.indexOf(name);
    const rowToStudent = row => headers.reduce((student, header, index) => {
      student[header] = row[index];
      return student;
    }, {});
    const findIndex = studentId => values.findIndex(row => String(row[column('student_id')]).trim() === String(studentId).trim());

    if (request.action === 'login') {
      const index = findIndex(request.student_id);
      const student = index < 0 ? null : rowToStudent(values[index]);
      if (!student || String(student.password) !== String(request.password) || String(student.status).toLowerCase() !== 'active') {
        return json({ error: 'Invalid Student ID or Password.' });
      }
      delete student.password;
      return json({ student: student });
    }

    if (request.action === 'add') {
      if (!request.name || !request.email || !request.program || !request.year) {
        return json({ error: 'Name, email, program, and year are required.' });
      }
      let number = values.length + 1;
      let studentId = 'ST' + String(number).padStart(3, '0');
      while (findIndex(studentId) >= 0) {
        number++;
        studentId = 'ST' + String(number).padStart(3, '0');
      }
      const temporaryPassword = Utilities.getUuid().replace(/-/g, '').substring(0, 6).toUpperCase();
      const student = {
        student_id: studentId,
        name: request.name,
        email: request.email,
        phone: request.phone,
        program: request.program,
        year: request.year,
        class: request.className,
        status: 'Active',
        password: temporaryPassword,
        created_at: new Date().toISOString()
      };
      sheet.appendRow(headers.map(header => student[header] || ''));
      return json({ student: student, temporary_password: temporaryPassword });
    }

    if (request.action === 'update' || request.action === 'deactivate') {
      const index = findIndex(request.student_id);
      if (index < 0) return json({ error: 'Student not found.' });
      const rowNumber = index + 2;
      const updates = request.action === 'deactivate' ? { status: 'Inactive' } : request;
      Object.keys(updates).forEach(key => {
        const cell = column(key);
        if (cell >= 0 && key !== 'action') sheet.getRange(rowNumber, cell + 1).setValue(updates[key]);
      });
      return json({ success: true });
    }

    return json({ error: 'Unsupported action.' });
  } catch (error) {
    return json({ error: 'Unable to process the request.' });
  }
}