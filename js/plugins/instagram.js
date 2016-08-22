/*!
 * Froala Instagram Plugin
 * Written by EvabioZ (evabioz@gmail.com)
 * Tested with Froala v2.0.5 (https://www.froala.com/wysiwyg-editor)
 */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = function( root, jQuery ) {
            if ( jQuery === undefined ) {
                // require('jQuery') returns a factory that requires window to
                // build a jQuery instance, we normalize how we use modules
                // that require this pattern but the window provided is a noop
                // if it's defined (how jquery works)
                if ( typeof window !== 'undefined' ) {
                    jQuery = require('jquery');
                }
                else {
                    jQuery = require('jquery')(root);
                }
            }
            factory(jQuery);
            return jQuery;
        };
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

  'use strict';

  var urlRe = /^(http|https):\/\/(instagr\.am|instagram\.com|www\.instagram\.com)\/p\/([^\/?]+)/;

  // Define popup template.
  $.extend($.FroalaEditor.POPUP_TEMPLATES, {
    "instagram.insert": '[_BUTTONS_][_INPUT_LAYER_]'
  });

  $.extend($.FroalaEditor.DEFAULTS, {
    instagramEmbedVersion: 7,
    instagramHelpText: 'Paste a URL to generate code'
  });

  $.merge($.FroalaEditor.DEFAULTS.htmlAllowedAttrs, [
    'onload'
  ]);

  // The custom popup is defined inside a plugin (new or existing).
  $.FroalaEditor.PLUGINS.instagram = function (editor) {

    // Create custom popup.
    function initPopup () {
      // Popup buttons.
      var popup_buttons = '';

      // Create the list of buttons.
      if (editor.opts.popupButtons && editor.opts.popupButtons.length > 0) {
        popup_buttons += '<div class="fr-buttons">';
        popup_buttons += editor.button.buildList(editor.opts.popupButtons);
        popup_buttons += '</div>';
      }

      var tab_idx = 0;
      var input_layer = '<div class="fr-link-insert-layer fr-layer fr-active" id="fr-link-insert-layer-' + editor.id + '">';
      input_layer += '<ul class="errorlist" style="display:none;"></ul>';
      if (editor.opts.instagramHelpText){
        input_layer += '<span class="fr-small-text">'+editor.language.translate(editor.opts.instagramHelpText)+'</span>';
      }
      input_layer += '<div class="fr-input-line"><input name="href" type="text" placeholder="https://www.instagram.com/p/" tabIndex="' + (++tab_idx) + '"></div>';
      input_layer += '<div class="fr-checkbox-line"><input name="captioned" type="checkbox" checked="checked" /><label>With Captioned</label></div>';
      input_layer += '<div class="fr-action-buttons"><button class="fr-command fr-submit" data-cmd="linkInstagramInsert" href="#" tabIndex="' + (++tab_idx) + '" type="button">' + editor.language.translate('Insert') + '</button></div></div>';

      // Load popup template.
      var template = {
        buttons: popup_buttons,
        input_layer: input_layer
      };

      // Create popup.
      return editor.popups.create('instagram.insert', template);
    }

    // Show the popup
    function showPopup () {
      // Get the popup object defined above.
      var $popup = editor.popups.get('instagram.insert');

      // If popup doesn't exist then create it.
      // To improve performance it is best to create the popup when it is first needed
      // and not when the editor is initialized.
      if (!$popup) $popup = initPopup();

      //reset popup
      resetPopup();

      // Set the editor toolbar as the popup's container.
      editor.popups.setContainer('instagram.insert', editor.$tb);

      // This will trigger the refresh event assigned to the popup.
      // editor.popups.refresh('instagram.insert');

      // This custom popup is opened by pressing a button from the editor's toolbar.
      // Get the button's object in order to place the popup relative to it.
      var $btn = editor.$tb.find('.fr-command[data-cmd="instagram"]');

      // Set the popup's position.
      var left = $btn.offset().left + $btn.outerWidth() / 2;
      var top = $btn.offset().top + (editor.opts.toolbarBottom ? 10 : $btn.outerHeight() - 10);

      // Show the custom popup.
      // The button's outerHeight is required in case the popup needs to be displayed above it.
      editor.popups.show('instagram.insert', left, top, $btn.outerHeight());
    }

    function resetPopup(){
      var $popup = editor.popups.get('instagram.insert');
      var $errors = $popup.find('ul.errorlist');
      var $input = $popup.find('input[type="text"][name="href"]');
      var $checkbox = $popup.find('input[type="checkbox"][name="captioned"]');
      $errors.hide();
      $errors.html('');
      $input.val('').trigger('change');
      $checkbox.prop('checked', true).trigger('checked');
    }

    // Hide the custom popup.
    function hidePopup () {
      editor.popups.hide('instagram.insert');
    }

    function showError(error){
      var $popup = editor.popups.get('instagram.insert');
      var $errors = $popup.find('ul.errorlist');
      var $input = $popup.find('input[type="text"][name="href"]');
      $errors.html('<li>'+error+'</li>').fadeIn();
      $input.one('keyup', function(){
        $errors.fadeOut();
      });
    }

    function insert(url, captioned){
      // Make sure we have focus.
      editor.events.focus(true);
      editor.selection.restore();

      //Trim off the whitespace.
      var clean = $.trim(url);

      if (clean === ''){
        showError('The URL is invalid. Please enter a valid URL.');
        return false;
      }

      //Escape whitespace
      clean = clean.replace(/ /g, '%20');

      var matches = clean.match(urlRe);
      if (!matches || matches.length < 4){
        showError('The URL is invalid. Please enter a valid URL.');
        return false;
      }

      // Get article information
      $.ajax({
        url: "https://api.instagram.com/oembed/",
        dataType: "jsonp",
        data: { url: matches[0] },
        success: function(response) {
          var url = matches[0] + (captioned ? '/embed/captioned/?v=' : '/embed/?v=') + editor.opts.instagramEmbedVersion;
          var onload = "$(window).on('message',$.proxy(function(e){var obj=$.parseJSON(e.originalEvent.data);if(this.contentWindow!==e.originalEvent.source)return;if(obj.type==='MEASURE')$(this).height(obj.details.height||500);},this))";
          editor.html.insert('<iframe onload="' + onload + '" class="fr-instagram" scrolling="no" frameborder="0" allowtransparency="true" src="' + url + '" style="border: 0; margin: 0; max-width: 658px; width: 100%; display: block; padding: 0; background: rgb(255, 255, 255);"></iframe><p><br></p>', true);
          var $instagram_embed = editor.$el.find('.fr-instagram');
          editor.popups.hide('instagram.insert');
          editor.events.trigger('instagram.inserted', [$instagram_embed, matches[0], matches[3]]);
        }
      });

      return false;
    }

    function insertCallback () {
      var $popup = editor.popups.get('instagram.insert');
      var url = $popup.find('input[type="text"][name="href"]').val();
      var captioned = $popup.find('input[type="checkbox"][name="captioned"]').is(':checked');

      var t = $(editor.original_window).scrollTop();
      insert(url, captioned);
      $(editor.original_window).scrollTop(t);
    }

    // Methods visible outside the plugin.
    return {
      showPopup: showPopup,
      hidePopup: hidePopup,
      insertCallback: insertCallback,
      resetPopup: resetPopup
    }
  };

  // Define an icon and command for the button that opens the custom popup.
  $.FroalaEditor.DefineIcon('instagramBtnIcon', {NAME: 'instagram'});
  $.FroalaEditor.RegisterCommand('instagram', {
    title: 'Insert Instagram',
    icon: 'instagramBtnIcon',
    undo: false,
    focus: true,
    popup: true,
    refreshOnCallback: false,
    callback: function () {
      if (!this.popups.isVisible('instagram.insert')) {
        this.instagram.showPopup();
      }
      else {
        if (this.$el.find('.fr-marker')) {
          this.events.disableBlur();
          this.selection.restore();
        }
        this.popups.hide('instagram.insert');
      }
    }
  });

  // Define custom popup insert button command.
  $.FroalaEditor.RegisterCommand('linkInstagramInsert', {
    focus: false,
    refreshAfterCallback: false,
    callback: function () {
      this.instagram.insertCallback();
    }
  })

}));
