import joplin from 'api';
import { MenuItemLocation, SettingItemType, ToolbarButtonLocation } from 'api/types';
const showdown = require("showdown");
const nodemailer = require("nodemailer");

joplin.plugins.register({
    onStart: async function () {
        await joplin.settings.registerSection("joplin-note-email", {
            label: "joplin-note-email",
            iconName: "far fa-envelope",
        });

        await joplin.settings.registerSettings({
            'host': {
                label: 'host',
                value: 'smtp.office365.com',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
            },
            'port': {
                label: 'port',
                value: 587,
                type: SettingItemType.Int,
                section: 'joplin-note-email',
                public: true,
            },
            'secure': {
                label: 'secure',
                value: false,
                type: SettingItemType.Bool,
                section: 'joplin-note-email',
                public: true,
                description: 'ssl',
            },
            'user': {
                label: 'user',
                value: '',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
            },
            'pass': {
                label: 'pass',
                value: '',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                secure: true
            },
            'to': {
                label: 'to',
                value: '',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
            },
        });


        //获取当前笔记
        async function getCurrentNote() {
            const note = await joplin.workspace.selectedNote();
            if (note) {
                return note;
            } else {
                console.info("没有选择笔记");
            }
        }
        await joplin.workspace.onNoteChange(() => {
            getCurrentNote();
        });
        await joplin.workspace.onNoteSelectionChange(() => {
            getCurrentNote();
        });
        getCurrentNote();

        await joplin.commands.register({
            name: "sendEmail",
            label: "joplin-note-email",
            iconName: "far fa-envelope",
            execute: async () => {
                const currNote = await getCurrentNote();
                if (currNote) {
                    sendEmail(currNote.title, currNote.body);
                } else {
                    console.info("执行命令错误");
                }
            },
        });

        await joplin.views.toolbarButtons.create(
            "email-button",
            "sendEmail",
            ToolbarButtonLocation.EditorToolbar
        );

        await joplin.commands.register({
            name: "emailSelection",
            label: "Email Selection",
            execute: async () => {
                const currNote = await getCurrentNote();
                // get selected text
                const selectedText = (await joplin.commands.execute(
                    "selectedText"
                )) as string;
                if (selectedText) {
                    sendEmail(currNote.title, selectedText);
                } else {
                    console.info("执行错误");
                }
            },
        });

        // create context menu item to email selection
        await joplin.views.menuItems.create(
            "emailSelectionThroughContextMenu",
            "emailSelection",
            MenuItemLocation.EditorContextMenu,
            { accelerator: "Ctrl+Alt+E" }
        );
    },
});
// 过滤标题
function filterHeadings(content) {
    const regex = /^(#{1,6} )/gm;
    const filteredContent = content.replace(regex, "");
    return filteredContent;
}

// 转换为html
function convertToHTML(content) {
    const converter = new showdown.Converter();

    // some options for the converter to be in line with Joplin's Markdown
    // 当一个段落后面跟着一个列表时，会有一种尴尬的效果。这种效果出现在一些情况下，在实时预览编辑器。
    converter.setOption("smoothPreview", true);
    // 换行
    converter.setOption("simpleLineBreaks", true);
    // 标题文本之间的空格不是必需的，但您可以通过启用requireSpaceBeforeHeadingText选项使其成为强制性的。＃
    converter.setOption("requireSpaceBeforeHeadingText", true)
    //删除线
    converter.setOption("strikethrough", true);
    // 任务列表
    converter.setOption("tasklists", true);
    //图片大小
    converter.setOption("parseImgDimensions", true)
    //表格
    converter.setOption("tables", true);
    //风格
    converter.setFlavor('github');
    converter


    const html = converter.makeHtml(content);

    return html;
}

// 将html中的src地址设置为nodemailer支持发松的格式
function htmlOfImageUrl(html) {
    const regExp = /<img[^>]+src=['"]([^'"]+)['"]+/g;
    let temp;
    while ((temp = regExp.exec(html)) != null) {
        let srcId = temp[1].replace(/:\//, "cid:");
        html = html.replace(temp[1], srcId);
    }
    return html;
}

// 获取html中的src地址，存为数组
async function htmlOfImage(html) {
    const regExp = /<img[^>]+src=['"]([^'"]+)['"]+/g;
    const result = [];
    let temp;
    while ((temp = regExp.exec(html)) != null) {
        let srcId = temp[1].replace(/:\//, "");

        let title;
        await joplin.data.get(['resources', srcId], {
            fields: "id, title, updated_time",
            order_by: "updated_time",
            order_dir: "DESC"
        }).then(function (obj) {
            title = obj.title;
        });
        await joplin.data.resourcePath(srcId).then(function (scr_url) {
            result.push({ 'filename': title, 'path': scr_url, 'cid': srcId });
        });
    }

    return result;
}

//通过nodeMailer发送消息
async function nodeMailerSend(host, port, secure, user, pass, from, to, subject, html, imgSrc) {
    imgSrc.then(function (attachments) {
        var transporter = nodemailer.createTransport({
            host: host,
            secureConnection: true,
            port: port,
            secure: secure,
            auth: {
                user: user,
                pass: pass
            },
            priority: "high"
        })


        var mailOptins = {
            from: from,
            to: to,
            subject: subject,
            html: html,
            attachments
        }
        console.log(mailOptins);
        transporter.sendMail(mailOptins, (error, info) => {
            if (error) {
                console.log(error)
            } else {
                console.log('邮件发送成功：' + info.response)
            }
        })
    });

}

// 发送邮件
async function sendEmail(title, content) {
    const filteredContent = convertToHTML(content);
    // filterHeadings(content);
    // 获取图像地址
    const attachments = htmlOfImage(filteredContent);
    const html = htmlOfImageUrl(filteredContent);

    const host = await joplin.settings.value("host");
    const port = await joplin.settings.value("port");
    const secure = await joplin.settings.value("secure");
    const user = await joplin.settings.value("user");
    const pass = await joplin.settings.value("pass");
    const to = await joplin.settings.value("to");
    // 发送消息
    nodeMailerSend(host, port, secure, user, pass, user, to, title, html, attachments);
}