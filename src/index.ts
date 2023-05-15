import joplin from 'api';
import { MenuItemLocation, SettingItemType, ToolbarButtonLocation } from 'api/types';
const showdown = require("showdown");
const nodemailer = require("nodemailer");
const $ = require('jquery');
const translations = require("./res/lang/translation.json");

let currentGlobal;

joplin.plugins.register({
    onStart: async function () {
        //获取joplin的语言
        async function getLocale() {
            return await joplin.settings.globalValue("locale");
        }
        currentGlobal = await getLocale();
        console.debug("joplin 现在的语言  ", currentGlobal)

        //如果joplin设置了新的语言，防止出错设置一个默认语言
        if (!currentGlobal) {
            currentGlobal = "zh_CN";
        }

        // 设置语言文本
        function translate(key) {
            return translations[currentGlobal][key] ?? key;
        }

        // 更改语言
        function changeLocale(locale) {
            currentGlobal = locale;
        }

        async function pollLocale() {
            const handlerOptions = { passive: true };
            console.debug("开始监测joplin语言变化");
            const interval = async () => {
                const newLocale = await getLocale();
                if (newLocale !== currentGlobal) {
                    currentGlobal = newLocale;
                    changeLocale(currentGlobal);
                    window.location.reload();
                }
                setTimeout(interval, 1000);
            };
            interval();
            window.addEventListener('scroll', interval, handlerOptions);
            console.debug("结束监测joplin语言变化");
        }
        // 在插件初始化时开始监听语言变化
        pollLocale();



        await joplin.settings.registerSettings({
            'host': {
                label: translate('host'),
                value: 'smtp.office365.com',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                description: translate('host_description'),
            },
            'port': {
                label: translate('port'),
                value: 587,
                type: SettingItemType.Int,
                section: 'joplin-note-email',
                public: true,
                description: translate('port_description'),
            },
            'secure': {
                label: translate('secure'),
                value: false,
                type: SettingItemType.Bool,
                section: 'joplin-note-email',
                public: true,
                description: translate('secure_description'),
            },
            'user': {
                label: translate('user'),
                value: '',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                description: translate('user_description'),
            },
            'pass': {
                label: translate('pass'),
                value: '',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                secure: true,
                description: translate('pass_description'),
            },
            'to': {
                label: translate('to'),
                value: '',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                description: translate('to_description'),
            },
            'table_style': {
                label: translate('table_style'),
                value: 'width: 100%; border-spacing: 0px; border-collapse: collapse; border: none; margin-top: 20px;',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                description: translate('table_style_description'),
                advanced: true
            },
            'th': {
                label: translate('th'),
                value: 'border: 1px solid #DBDBDB; color: #666666; font-size: 14px; font-weight: normal; text-align: left; padding-left: 14px;',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                description: translate('th_description'),
                advanced: true
            },
            'tr_even': {
                label: translate('tr_even'),
                value: 'height: 40px; background: #F6F6F6;',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                description: translate('tr_even_description'),
                advanced: true
            },
            'td': {
                label: translate('td'),
                value: 'border: 1px solid #DBDBDB; font-size: 14px; font-weight: normal; text-align: left; padding-left: 14px;',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                description: translate('td_description'),
                advanced: true
            },
            'tr_odd': {
                label: translate('tr_odd'),
                value: 'height: 40px;',
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                description: translate('tr_odd_description'),
                advanced: true
            },
            'blockquote': {
                label: translate('blockquote'),
                value: "color: #777; background-color: rgba(66, 185, 131, .1);  border-left: 4px solid #42b983;padding: 10px 15px;position: relative;font-family: 'Roboto', sans-serif;line-height: 150%;text-indent: 35px;",
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                description: translate('blockquote_description'),
                advanced: true
            },
            'pre': {
                label: translate('pre'),
                value: "overflow-x:scroll;padding: 1rem;font-size: 85%;line-height: 1.45;background-color: #f7f7f7;border: 0;border-radius: 3px;color: #777777;margin-top: 0 !important;",
                type: SettingItemType.String,
                section: 'joplin-note-email',
                public: true,
                description: translate('pre_description'),
                advanced: true
            },
            'latex': {
                label: translate('latex'),
                value: "https://www.zhihu.com/equation?tex=",
                type: SettingItemType.String,
                options: {
                    "https://www.zhihu.com/equation?tex=": "https://www.zhihu.com/equation?tex=", "https://latex.codecogs.com/svg.image?": "https://latex.codecogs.com/svg.image?", "https://chart.googleapis.com/chart?cht=tx&chl=": "https://chart.googleapis.com/chart?cht=tx&chl="
                },
                section: 'joplin-note-email',
                description: translate('latex_description'),
                public: true,
                isEnum: true,
                advanced: true
            },
        });

        await joplin.settings.registerSection("joplin-note-email", {
            label: translate('noteEmail'),
            iconName: "far fa-envelope",
        });

        // 获取当前笔记
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

        // 命令行发送邮件
        await joplin.commands.register({
            name: "sendEmail",
            label: translate('sendEmail'),
            iconName: "fa fa-solid fa-envelope",
            execute: async () => {
                const currNote = await getCurrentNote();
                if (currNote) {
                    sendEmail(currNote.title, currNote.body);
                } else {
                    console.info("执行命令错误");
                }
            },
        });

        // 右键 发送选中文本
        await joplin.commands.register({
            name: "sendEmailSelection",
            label: translate('sendEmailSelection'),
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

        // 上下文菜单
        await joplin.views.menuItems.create(
            "emailSelectionThroughContextMenu",
            "sendEmailSelection",
            MenuItemLocation.EditorContextMenu,
            { accelerator: "Ctrl+Alt+E" }
        );

        // 工具栏按钮
        await joplin.views.toolbarButtons.create(
            "email-button",
            "sendEmail",
            ToolbarButtonLocation.EditorToolbar
        );
    },
});
// 过滤标题
function filterHeadings(content) {
    const regex = /^(#{1,6} )/gm;
    const filteredContent = content.replace(regex, "");
    return filteredContent;
}

var style_extension = function () {
    // bootstrap，放弃，email不支持
    var style_html = {
        type: 'output',
        filter: async (html) => {
            const table_style = await joplin.settings.value("table_style");
            const th = await joplin.settings.value("th");
            const tr_even = await joplin.settings.value("tr_even");
            const td = await joplin.settings.value("td");
            const tr_odd = await joplin.settings.value("tr_odd");
            const blockquote = await joplin.settings.value("blockquote");
            const pre = await joplin.settings.value("pre");
            const latex = await joplin.settings.value("latex");
            var liveHtml = $('<html></html>').html(html);
            console.log(liveHtml)
            $("table", liveHtml).each(function () {
                var table = $(this);
                table.attr('style', table_style);
            });
            $("tr:even", liveHtml).each(function () {
                var table = $(this);
                table.attr('style', tr_even);
            });
            $("th", liveHtml).each(function () {
                var table = $(this);
                table.attr('style', th);
            });
            $("tr:odd", liveHtml).each(function () {
                var table = $(this);
                table.attr('style', tr_odd);
            });
            $("td", liveHtml).each(function () {
                var table = $(this);
                table.attr('style', td);
            });
            $("blockquote", liveHtml).each(function () {
                var table = $(this);
                table.attr('style', blockquote);
            });
            $("pre", liveHtml).each(function () {
                var table = $(this);
                table.attr('style', pre);
            });
            $("p", liveHtml).each(function () {
                if ($(this).html().startsWith("$") && $(this).html().endsWith("$")) {
                    var text = $(this).html().replace(/[<br>]/g, "").replace(/\$/g, "");
                    $(this).html("<br><img src='" + latex + text + "' text='" + text + "' />")
                }
            });
            //图片自适应
            $("img", liveHtml).each(function () {
                var table = $(this);
                table.attr('style', "max-width:100%;overflow:hidden;");
            });
            return liveHtml.html();
        },
    };
    return [style_html];
}

// 转换为html
function convertToHTML(content) {
    const converter = new showdown.Converter({
        extensions: [style_extension]
    });

    // 当一个段落后面跟着一个列表时，会有一种尴尬的效果。这种效果出现在一些情况下，在实时预览编辑器。
    converter.setOption("smoothPreview", true);
    // 换行
    converter.setOption("simpleLineBreaks", true);
    // 标题文本之间的空格不是必需的，但您可以通过启用requireSpaceBeforeHeadingText选项使其成为强制性的。＃
    converter.setOption("requireSpaceBeforeHeadingText", true);
    // 删除线
    converter.setOption("strikethrough", true);
    // 任务列表
    converter.setOption("tasklists", true);
    // 图片大小
    converter.setOption("parseImgDimensions", true);
    // 表格
    converter.setOption("tables", true);
    // 完整html
    converter.setOption("completeHTMLDocument", true);
    // 启动emoji
    converter.setOption("emoji", true);
    // 风格
    converter.setFlavor('github');


    const html = converter.makeHtml(content);

    return html;
}

// 将html中的src地址设置为nodemailer支持发松的格式
function htmlOfImageUrl(html) {
    const regExp = /<img[^>]+src=['"]([^'"]+)['"]+/g;
    let temp;
    while ((temp = regExp.exec(html)) != null) {
        if (temp[1].startsWith(":/")) {
            let srcId = temp[1].replace(/:\//, "cid:");
            html = html.replace(temp[1], srcId);
        }
    }
    return html;

    // var liveHtml = $('<div></div>').html(html);
    // var return_html = $('img', liveHtml).each(function () {
    //     var img_url = $(this).attr('src').replace(/:\//, "cid:");
    // });

    // console.log(return_html)
    // return liveHtml;
}

// 获取html中的src地址，存为数组
async function htmlOfImage(html) {
    const regExp = /<img[^>]+src=['"]([^'"]+)['"]+/g;
    const result = [];
    let temp;
    while ((temp = regExp.exec(html)) != null) {
        if (temp[1].startsWith(":/")) {
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
        function translate(key) {
            return translations[currentGlobal][key] ?? key;
        }
        transporter.sendMail(mailOptins, (error, info) => {
            if (error) {
                joplin.views.dialogs.showMessageBox(translate('sendMailFailed') + error)
            } else {
                joplin.views.dialogs.showMessageBox(translate('mailSentSuccessfully') + info.response)
            }
        })
    });

}

// 发送邮件
async function sendEmail(title, content) {
    const host = await joplin.settings.value("host");
    const port = await joplin.settings.value("port");
    const secure = await joplin.settings.value("secure");
    const user = await joplin.settings.value("user");
    const pass = await joplin.settings.value("pass");
    const to = await joplin.settings.value("to");

    convertToHTML(content).then(function (htmlText) {
        // 获取图像地址
        const attachments = htmlOfImage(htmlText);
        // 适合nodeMailer的图像地址
        const html = htmlOfImageUrl(htmlText)
        // 发送消息
        nodeMailerSend(host, port, secure, user, pass, user, to, title, html, attachments);
    });
}