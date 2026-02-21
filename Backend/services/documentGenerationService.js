/**
 * Clinical Consultation Document Generator
 * Accepts two JSONs:
 *   1. transcript_json  — full speaker-turn transcript
 *   2. extraction_json  — NLP-extracted entities (symptoms, history, etc.)
 */

const {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  HeadingLevel,
  convertInchesToTwip,
} = require('docx');
const fs = require('fs');

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function na(val) {
  if (val === null || val === undefined || String(val).trim() === '') {
    return 'N/A';
  }
  return String(val);
}

function createCellShading(hexColor) {
  return {
    fill: hexColor,
    type: ShadingType.CLEAR,
    color: 'auto',
  };
}

function createStyledCell(text, options = {}) {
  const {
    bold = false,
    fontSize = 20,
    color = '000000',
    shading,
    alignment = AlignmentType.LEFT,
    margins = { top: 100, bottom: 100, left: 120, right: 120 }
  } = options;

  const rgb = hexToRgb(color);

  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            size: fontSize,
            color: color.replace('#', ''),
            font: 'Arial',
          }),
        ],
        alignment,
      }),
    ],
    shading: shading ? createCellShading(shading) : undefined,
    margins,
  });
}

function createSectionHeader(text, colorHex = '1A3C5E') {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26,
        color: colorHex,
        font: 'Arial',
      }),
    ],
    spacing: { before: 280, after: 120 },
    border: {
      bottom: {
        color: colorHex,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
  });
}

// ── Section Builders ───────────────────────────────────────────────────────

function buildStatsSection(turns, duration) {
  const clinicianTurns = turns.filter(t => t.speaker === 'CLINICIAN');
  const patientTurns = turns.filter(t => t.speaker === 'PATIENT');
  const avgConf = (turns.reduce((sum, t) => sum + t.confidence, 0) / turns.length) * 100;

  const stats = [
    { label: 'Duration', value: formatTime(duration) },
    { label: 'Total Turns', value: String(turns.length) },
    { label: 'Clinician Turns', value: String(clinicianTurns.length) },
    { label: 'Avg Confidence', value: `${avgConf.toFixed(1)}%` },
  ];

  const headerCells = stats.map(stat => 
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: stat.label,
              bold: true,
              size: 18,
              color: '1A3C5E',
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: stat.value,
              bold: true,
              size: 28,
              color: '2E75B6',
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
      shading: createCellShading('EBF3FB'),
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
    })
  );

  return [
    createSectionHeader('Session Overview'),
    new Table({
      rows: [new TableRow({ children: headerCells })],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({ text: '' }),
  ];
}

function buildSymptomsSection(entities) {
  const symptoms = entities.symptoms || [];
  if (!symptoms.length) return [];

  const headers = ['Symptom', 'Onset', 'Duration', 'Location', 'Character', 'Severity'];
  const colWidths = [2600, 2000, 2600, 2400, 2000, 1400];

  const headerRow = new TableRow({
    children: headers.map((h, i) => 
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: h,
                bold: true,
                size: 18,
                color: 'FFFFFF',
                font: 'Arial',
              }),
            ],
          }),
        ],
        shading: createCellShading('C0392B'),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: colWidths[i], type: WidthType.DXA },
      })
    ),
  });

  const dataRows = symptoms.map((sym, idx) => {
    const bg = idx % 2 === 0 ? 'FEF9F9' : 'FFFFFF';
    const values = [
      sym.description,
      sym.onset,
      sym.duration,
      sym.location,
      sym.character,
      sym.severity,
    ];

    return new TableRow({
      children: values.map((val, i) => 
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: na(val),
                  bold: i === 0,
                  size: 18,
                  color: i === 0 ? '7B241C' : '000000',
                  font: 'Arial',
                }),
              ],
            }),
          ],
          shading: createCellShading(bg),
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          width: { size: colWidths[i], type: WidthType.DXA },
        })
      ),
    });
  });

  return [
    createSectionHeader('Presenting Symptoms', 'C0392B'),
    new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({ text: '' }),
  ];
}

function buildVitalsSection(entities) {
  const vitals = entities.vitals || [];
  if (!vitals.length) return [];

  const headers = ['Vital', 'Value', 'Notes'];
  const headerRow = new TableRow({
    children: headers.map(h => 
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: h,
                bold: true,
                size: 20,
                color: 'FFFFFF',
                font: 'Arial',
              }),
            ],
          }),
        ],
        shading: createCellShading('1A3C5E'),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      })
    ),
  });

  const dataRows = vitals.map((v, idx) => {
    const bg = idx % 2 === 0 ? 'EBF3FB' : 'FFFFFF';
    const values = [v.name || '', v.value || '', v.notes || ''];

    return new TableRow({
      children: values.map(val => 
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: na(val),
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
          shading: createCellShading(bg),
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        })
      ),
    });
  });

  return [
    createSectionHeader('Vitals'),
    new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({ text: '' }),
  ];
}

function buildFamilyHistorySection(entities) {
  const fh = entities.family_history || [];
  if (!fh.length) return [];

  const headers = ['Condition', 'Relation', 'Date / Duration'];
  const headerRow = new TableRow({
    children: headers.map(h => 
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: h,
                bold: true,
                size: 20,
                color: 'FFFFFF',
                font: 'Arial',
              }),
            ],
          }),
        ],
        shading: createCellShading('6C3483'),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      })
    ),
  });

  const dataRows = fh.map((item, idx) => {
    const bg = idx % 2 === 0 ? 'F5EEF8' : 'FFFFFF';
    const values = [item.condition, item.relation, item.date_or_duration];

    return new TableRow({
      children: values.map((val, i) => 
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: na(val),
                  bold: i === 0,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
          shading: createCellShading(bg),
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        })
      ),
    });
  });

  return [
    createSectionHeader('Family History', '6C3483'),
    new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({ text: '' }),
  ];
}

function buildSocialHistorySection(entities) {
  const sh = entities.social_history || {};
  
  const rowsData = [
    ['Smoking', sh.smoking],
    ['Alcohol', sh.alcohol],
    ['Occupation', sh.occupation],
    ['Exercise', sh.exercise],
    ['Cannabis', sh.cannabis],
    ['Diet', sh.diet],
  ].filter(([_, v]) => v);

  if (!rowsData.length) return [];

  const headers = ['Category', 'Details'];
  const headerRow = new TableRow({
    children: headers.map(h => 
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: h,
                bold: true,
                size: 20,
                color: 'FFFFFF',
                font: 'Arial',
              }),
            ],
          }),
        ],
        shading: createCellShading('1A5276'),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      })
    ),
  });

  const dataRows = rowsData.map(([cat, detail], idx) => {
    const bg = idx % 2 === 0 ? 'EBF5FB' : 'FFFFFF';

    return new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cat,
                  bold: true,
                  size: 20,
                  color: '1A5276',
                  font: 'Arial',
                }),
              ],
            }),
          ],
          shading: createCellShading(bg),
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: na(detail),
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
          shading: createCellShading(bg),
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        }),
      ],
    });
  });

  return [
    createSectionHeader('Social History', '1A5276'),
    new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({ text: '' }),
  ];
}

function buildMedicationsSection(entities) {
  const meds = entities.medications || [];
  const allergies = entities.allergies || [];

  if (!meds.length && !allergies.length) return [];

  const sections = [createSectionHeader('Medications & Allergies', '117A65')];

  // Medications
  const medText = meds.length 
    ? meds.map(m => m.name || na(m)).join(', ')
    : 'None reported';

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Medications:  ',
          bold: true,
          size: 20,
          color: '117A65',
          font: 'Arial',
        }),
        new TextRun({
          text: medText,
          size: 20,
          font: 'Arial',
        }),
      ],
    })
  );

  // Allergies
  const allergyText = allergies.length
    ? allergies.map(a => a.substance || na(a)).join(', ')
    : 'None reported';

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Allergies:  ',
          bold: true,
          size: 20,
          color: 'CB4B35',
          font: 'Arial',
        }),
        new TextRun({
          text: allergyText,
          size: 20,
          font: 'Arial',
        }),
      ],
    })
  );

  sections.push(new Paragraph({ text: '' }));

  return sections;
}

function buildTranscriptSection(turns) {
  const headers = ['Time', 'Speaker', 'Dialogue'];
  const colWidths = [1400, 2200, 9400];

  const headerRow = new TableRow({
    children: headers.map((h, i) => 
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: h,
                bold: true,
                size: 20,
                color: 'FFFFFF',
                font: 'Arial',
              }),
            ],
          }),
        ],
        shading: createCellShading('1A3C5E'),
        margins: { top: 70, bottom: 70, left: 100, right: 100 },
        width: { size: colWidths[i], type: WidthType.DXA },
      })
    ),
  });

  const dataRows = turns.map((turn, idx) => {
    const isClinician = turn.speaker === 'CLINICIAN';
    const rowBg = idx % 2 === 0 ? 'FFFFFF' : 'F5F9FF';
    const speakerColor = isClinician ? '1A3C5E' : '2D6A4F';
    const speakerLabel = isClinician ? '🩺 Clinician' : '🧑 Patient';

    return new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: formatTime(turn.start_time),
                  size: 16,
                  color: '888888',
                  font: 'Arial',
                }),
              ],
            }),
          ],
          shading: createCellShading(rowBg),
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          width: { size: colWidths[0], type: WidthType.DXA },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: speakerLabel,
                  bold: true,
                  size: 18,
                  color: speakerColor,
                  font: 'Arial',
                }),
              ],
            }),
          ],
          shading: createCellShading(rowBg),
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          width: { size: colWidths[1], type: WidthType.DXA },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: turn.text,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
          shading: createCellShading(rowBg),
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          width: { size: colWidths[2], type: WidthType.DXA },
        }),
      ],
    });
  });

  return [
    createSectionHeader('Full Consultation Transcript'),
    new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({ text: '' }),
  ];
}

// ── Main Generator ─────────────────────────────────────────────────────────

function generateConsultationDoc(transcriptJson, extractionJson, outputPath) {
  const turns = transcriptJson.transcript.turns;
  const duration = transcriptJson.audio_duration_seconds || 0;
  const entities = extractionJson.entities || {};

  const sections = [];

  // Title
  sections.push(
    new Paragraph({
      text: 'Clinical Consultation Report',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Clinical Consultation Report',
          bold: true,
          size: 32,
          color: '1A3C5E',
          font: 'Arial',
        }),
      ],
    })
  );

  // Metadata
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generated: ',
          bold: true,
          size: 20,
          font: 'Arial',
        }),
        new TextRun({
          text: `${dateStr}    `,
          size: 20,
          font: 'Arial',
        }),
        new TextRun({
          text: 'Duration: ',
          bold: true,
          size: 20,
          font: 'Arial',
        }),
        new TextRun({
          text: `${formatTime(duration)}    `,
          size: 20,
          font: 'Arial',
        }),
        new TextRun({
          text: 'Status: ',
          bold: true,
          size: 20,
          font: 'Arial',
        }),
        new TextRun({
          text: 'AI-Generated — Pending Clinician Review',
          bold: true,
          size: 20,
          color: 'E67E22',
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
    })
  );

  sections.push(new Paragraph({ text: '' }));

  // Build all sections
  sections.push(...buildStatsSection(turns, duration));
  sections.push(...buildSymptomsSection(entities));
  sections.push(...buildVitalsSection(entities));
  sections.push(...buildFamilyHistorySection(entities));
  sections.push(...buildSocialHistorySection(entities));
  sections.push(...buildMedicationsSection(entities));
  sections.push(...buildTranscriptSection(turns));

  // Disclaimer
  sections.push(createSectionHeader('Disclaimer & Sign-off', '888888'));
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'This document was generated using AI-assisted speech recognition and clinical entity extraction. ' +
                'All content must be reviewed and verified by the attending clinician before use in official medical records. ' +
                'Unauthorized disclosure of this document is prohibited.',
          size: 18,
          italics: true,
          color: '666666',
          font: 'Arial',
        }),
      ],
    })
  );

  sections.push(new Paragraph({ text: '' }));
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Clinician Signature: _________________________    ' +
                'Date: _______________    ' +
                'License No: _______________',
          size: 20,
          font: 'Arial',
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children: sections,
    }],
  });

  return doc;
}

// ── Export ─────────────────────────────────────────────────────────────────

module.exports = {
  generateConsultationDoc,
  formatTime,
  na,
};
