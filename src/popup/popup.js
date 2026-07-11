import browser from 'webextension-polyfill';
import { mountFilterPanel } from '../shared/filterPanel.js';

mountFilterPanel(document.getElementById('panel'));

document.getElementById('open-options').addEventListener('click', (event) => {
  event.preventDefault();
  browser.runtime.openOptionsPage();
});
