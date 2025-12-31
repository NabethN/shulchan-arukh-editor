// src/lib/loroService.js

export async function convertTiptapToCleanDB(tiptapJson, previousBinary = null) {
    // טעינה דינמית של הספרייה
    const { Loro } = await import('loro-crdt');

    // בגרסה 0.16.x האתחול הוא ישיר
    const doc = new Loro();

    if (previousBinary) {
        doc.import(previousBinary);
    }

    const textObj = doc.getText("content");

    // ... המשך הקוד שלך נשאר זהה ...
    if (!previousBinary) {
        let plainText = "";
        tiptapJson.content?.forEach(p => {
            if (p.content) p.content.forEach(n => plainText += n.text || "");
            plainText += "\n";
        });
        textObj.insert(0, plainText);
    }

    const cleanAnnotations = [];
    let currentPos = 0;

    tiptapJson.content?.forEach(paragraph => {
        if (paragraph.content) {
            paragraph.content.forEach(node => {
                const textLength = (node.text || "").length;
                const commentMark = node.marks?.find(m => m.type === 'comment');
                if (commentMark) {
                    cleanAnnotations.push({
                        uuid: commentMark.attrs.id,
                        start_index: currentPos,
                        end_index: currentPos + textLength,
                        text_preview: node.text
                    });
                }
                currentPos += textLength;
            });
        }
        currentPos += 1;
    });

    return {
        cleanText: textObj.toString(),
        annotations: cleanAnnotations,
        binary: doc.exportFrom()
    };
}