export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Bot endpoint active');
  }

  const tgToken = Buffer.from('NjIwMzM0MzkzNDpBQUdsLTdKQjdfSzhMUEVJN2pVS2lqVkc2a3VaRF9Zckk5TQ==', 'base64').toString('ascii');
  const url = Buffer.from('aHR0cHM6Ly9kbGNsamV0bHBxb2R0YndiY25rdS5zdXBhYmFzZS5jbw==', 'base64').toString('ascii');
  const key = Buffer.from('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1Sc1kyeHFaWFJzY0hGdlpIUmlkMkpqYm10MUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzT0RJek1EUTVORFlzSW1WNGNDSTZNakE1TnpnNE1EazBObjAucUVmSWZTOEJWSl9kVkFMelgydXBvMjgzX3FObkxIVE12TE1UQUVrMDhLOA==', 'base64').toString('ascii');

  try {
    const body = req.body;
    
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const data = callbackQuery.data; // "course_1", "course_all", etc
      
      const courseSemesters = {
        'course_1': ['1', '2'],
        'course_2': ['3', '4'],
        'course_3': ['5', '6'],
        'course_4': ['7', '8']
      };

      const fetchAll = async (dir, sems) => {
        const headers = { 'apikey': key, 'Authorization': 'Bearer ' + key };
        const r = await fetch(url + '/rest/v1/gpa_results?select=id,avg_gpa,device_info,direction_name,created_at&direction=eq.' + dir + '&created_at=gt.2026-06-24T15:05:00.000Z&order=created_at.desc&limit=500', { headers });
        const rows = await r.json();
        if (!rows || rows.error) return [];
        const uniqueMap = new Map();
        const filtered = [];
        rows.forEach(row => {
          let sid = row.device_info?.session_id || row.id;
          if (!uniqueMap.has(sid)) {
            uniqueMap.set(sid, true);
            filtered.push(row);
          }
        });
        
        let finalRows = filtered;
        if (sems) {
          finalRows = filtered.filter(row => {
            let semNum = "2";
            if (row.direction_name) {
              const matchNew = row.direction_name.match(/\(Семестр (\d)\)/);
              const matchOld = row.direction_name.match(/\(Sem (.+)\)/);
              if (matchNew) {
                semNum = matchNew[1];
              } else if (matchOld) {
                const romans = {"I":"1", "II":"2", "III":"3", "IV":"4", "V":"5", "VI":"6", "VII":"7", "VIII":"8"};
                semNum = romans[matchOld[1]] || "2";
              }
            }
            return sems.includes(semNum);
          });
        }
        
        finalRows.sort((a, b) => b.avg_gpa - a.avg_gpa);
        return finalRows;
      };

      const semsToFilter = courseSemesters[data];
      const seData = await fetchAll('se', semsToFilter);
      const csData = await fetchAll('cs', semsToFilter);

      const formatAll = (data, title) => {
        if (!data || data.length === 0) return title + ':\n(пока нет результатов)';
        return title + ':\n' + data.map((x, i) => {
          let sem = '(Семестр 2)';
          if (x.direction_name) {
            const matchNew = x.direction_name.match(/\(Семестр \d\)/);
            const matchOld = x.direction_name.match(/\(Sem (.+)\)/);
            if (matchNew) {
              sem = matchNew[0];
            } else if (matchOld) {
              const romans = {'I':'1', 'II':'2', 'III':'3', 'IV':'4', 'V':'5', 'VI':'6', 'VII':'7', 'VIII':'8'};
              sem = '(Семестр ' + (romans[matchOld[1]] || '2') + ')';
            }
          }
          let dateStr = '';
          if (x.created_at) {
            const d = new Date(x.created_at);
            const pad = n => String(n).padStart(2, '0');
            dateStr = ` [${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}]`;
          }
          return `${i + 1}. ${Number(x.avg_gpa).toFixed(2)} ${sem}${dateStr}`;
        }).join('\n');
      };

      let headerTitle = "🏆 Обновленный Лидерборд GPA:";
      if (data === 'course_1') headerTitle = "🏆 Лидерборд GPA (1 Курс):";
      else if (data === 'course_2') headerTitle = "🏆 Лидерборд GPA (2 Курс):";
      else if (data === 'course_3') headerTitle = "🏆 Лидерборд GPA (3 Курс):";
      else if (data === 'course_4') headerTitle = "🏆 Лидерборд GPA (4 Курс):";

      const newText = headerTitle + '\n\n' + formatAll(seData, '💻 Software Engineering') + '\n\n' + formatAll(csData, '🛡️ Cyber Security');

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: "1 Курс", callback_data: "course_1" },
            { text: "2 Курс", callback_data: "course_2" }
          ],
          [
            { text: "3 Курс", callback_data: "course_3" },
            { text: "4 Курс", callback_data: "course_4" }
          ],
          [
            { text: "Показать все", callback_data: "course_all" }
          ]
        ]
      };

      // Редактируем сообщение с новым текстом
      await fetch(`https://api.telegram.org/bot${tgToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: callbackQuery.message.chat.id,
          message_id: callbackQuery.message.message_id,
          text: newText,
          reply_markup: replyMarkup
        })
      });

      // Отвечаем на callback_query, чтобы убрать часики загрузки с кнопки
      await fetch(`https://api.telegram.org/bot${tgToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id
        })
      });
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
