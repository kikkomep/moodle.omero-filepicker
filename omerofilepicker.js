M.form_filepicker = {};
M.form_filepicker.Y = null;
M.form_filepicker.instances = [];

M.form_filepicker.callback = function (params) {

    var me = M.form_filepicker;
    var html = "";
    var url = params['url'];

    var newURL = window.location.protocol + "/" + window.location.host + "/" + window.location.pathname;

    // FIXME: check whether there exists a better method to identify the file type
    if (url.indexOf("webgateway") > -1 || url.indexOf("omero-image-repository") > -1) {

        var server_address = url.substring(0, url.indexOf("webgateway") - 1);

        // FIXME: configure me !!!
        var frame_id = "omero-image-viewer";

        // compute the imageId from the actual url
        var image_id = url.substring(url.lastIndexOf("/") + 1);
        var image_params = null;
        var image_params_index = url.indexOf("?");
        if (image_params_index > 0) {
            image_params = url.substr(image_params_index + 1);
            image_id = url.substring(url.lastIndexOf("/") + 1, image_params_index);
        }

        var visible_rois = params['visible_rois'];
        if (!visible_rois || visible_rois == "none") {
            var visible_rois_index = url.indexOf("&visibleRois=");
            if (visible_rois_index > 0) {
                visible_rois = url.substr(visible_rois_index);
            }
        }

        // FIXME: only for debug
        console.log("Server Address: " + server_address);
        console.log("URL: " + url);
        console.log("IMAGE_ID: " + image_id);
        console.log("IMAGE_PARAMS: " + image_params);
        console.log("VISIBLE_ROIS: " + visible_rois);
        console.log("Moodle Server:" + M.form_filepicker.Y.moodle_server);

        var moodle_viewer_for_omero_url = M.form_filepicker.Y.moodle_server + "/repository/omero/viewer/viewer.php";

        me.current_loaded_image = {
            omero_server_address: server_address,
            image_id: image_id,
            frame_id: frame_id,
            moodle_viewer_for_omero_url: moodle_viewer_for_omero_url
        };


        html = '<iframe width="100%" height="400px"' +
            ' src="' + moodle_viewer_for_omero_url +
            '?id=' + +image_id +
            '&frame=' + frame_id +
            '&width=' + encodeURIComponent("100%") +
            '&height=' + encodeURIComponent("500px") +
            '&showRoiTable=true' +
            '&' + image_params +
            (visible_rois ? '&visibleRois=' + visible_rois : "") +
            '" id="' + frame_id + '" name="' + frame_id + '" ' +
            ' onload="M.form_filepicker.notifyFrameLoaded(this)" ' +
            '></iframe>';

        M.form_filepicker.Y.one('#file_info_' + params['client_id'] + ' .filepicker-filename').setContent(html);

        // FIXME: to enhance for supporting multiple viewers in one page (i.e., how to identify the proper form?)
        // Update the reference to the selected OMERO image
        var forms = document.forms;
        for (var i in forms) {
            if (forms[i].elements) {
                if (forms[i].elements['omero_image_url']) {
                    forms[i].elements['omero_image_url'].value = url;
                }
            }
        }
    } else { // Default filepicker viewer
        html = '<a href="' + params['url'] + '">' + params['file'] + '</a>';
        html += '<div class="dndupload-progressbars"></div>';
        M.form_filepicker.Y.one('#file_info_' + params['client_id'] + ' .filepicker-filename').setContent(html);
    }

    //When file is added then set status of global variable to true
    var elementName = M.core_filepicker.instances[params['client_id']].options.elementname;
    M.form_filepicker.instances[elementName].fileadded = true;
    //generate event to indicate changes which will be used by disable if or validation code
    M.form_filepicker.Y.one('#id_' + elementName).simulate('change');
};

/**
 * This function is called for each file picker on page.
 */
M.form_filepicker.init = function (Y, options) {
    //Keep reference of YUI, so that it can be used in callback.
    M.form_filepicker.Y = Y;

    // FIXME: disallow not needed repositories from the PHP code
    for (var i in options.repositories) {
        if (options.repositories[i].type !== "omero")
            delete options.repositories[i];
    }

    //For client side validation, initialize file status for this filepicker
    M.form_filepicker.instances[options.elementname] = {};
    M.form_filepicker.instances[options.elementname].fileadded = false;

    //Set filepicker callback
    options.formcallback = M.form_filepicker.callback;

    // Set MoodleServer
    M.form_filepicker.Y.moodle_server = options.moodle_server;

    if (!M.core_filepicker.instances[options.client_id]) {
        M.core_filepicker.init(Y, options);
    }
    Y.on('click', function (e, client_id) {
        e.preventDefault();
        if (this.ancestor('.fitem.disabled') == null) {
            M.core_filepicker.instances[client_id].show();
        }
    }, '#filepicker-button-' + options.client_id, null, options.client_id);

    var item = document.getElementById('nonjs-filepicker-' + options.client_id);
    if (item) {
        item.parentNode.removeChild(item);
    }
    item = document.getElementById('filepicker-wrapper-' + options.client_id);
    if (item) {
        item.style.display = '';
    }

    var dndoptions = {
        clientid: options.client_id,
        moodle_server: options.moodle_server,
        acceptedtypes: options.accepted_types,
        author: options.author,
        maxfiles: -1,
        maxbytes: options.maxbytes,
        itemid: options.itemid,
        repositories: options.repositories,
        formcallback: options.formcallback,
        containerprefix: '#file_info_',
        containerid: 'file_info_' + options.client_id,
        contextid: options.context.id,
        omero_image_server: options.omero_image_server
    };

    M.form_dndupload.init(Y, dndoptions);

    // Checks whether an OMERO image has been selected (usefull after page refresh)
    var omero_image_url = options["omero_image_url"];
    if (!omero_image_url) {
        var imgs = document.getElementsByName("omero_image_url");
        if (imgs && imgs.length > 0) {
            omero_image_url = imgs[0].value;
            options.visible_rois = document.getElementsByName("visible_rois");
            if (options.visible_rois && options.visible_rois.length > 0)
                options.visible_rois = options.visible_rois[0].value;
        }
    }

    if (omero_image_url != null && omero_image_url.length > 0 && omero_image_url != 'none') {
        M.form_filepicker.callback({
            client_id: dndoptions.clientid,
            url: omero_image_url,
            visible_rois: options.visible_rois,
            options: dndoptions
        });
    }
};

/**
 * Returns a JSON description of the current loaded image
 *
 * @returns {{server_address: string, image_id: *}|*}
 */
M.form_filepicker.getCurrentLoadedImage = function () {
    return M.form_filepicker.current_loaded_image;
};


/**
 * Notifies that frame is completely loaded !!!
 * @param frame_obj frame object reference
 */
M.form_filepicker.notifyFrameLoaded = function (frame_obj) {
    console.log("Frame '" + frame_obj.id + "' is loaded!!!", frame_obj);
    document.dispatchEvent(new CustomEvent('frameLoaded', {
        detail: M.form_filepicker.current_loaded_image,
        bubbles: true
    }));
};