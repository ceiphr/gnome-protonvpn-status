<h1 align="center">
  <img width="500px" src="assets/readme-banner.png">
  
  ![Gnome version][gv] ![GitHub top language][gtl] ![License][l]
</h1>

[gv]: https://img.shields.io/badge/gnome-3.36-blue?logo=gnome&logoColor=white
[gtl]: https://img.shields.io/github/languages/top/ceiphr/gnome-protonvpn-status
[l]: https://img.shields.io/github/license/ceiphr/gnome-protonvpn-status

<h5 align="center"> A GNOME extension for controlling and monitoring your ProtonVPN connection through the GNOME DE. </h5>

## **IMPORTANT FOR THIS EXTENSION TO WORK**

[**You need to follow this official guide by the ProtonVPN team to allow this extension to handle the ProtonVPN linux-cli client without superuser privileges.**](https://github.com/ProtonVPN/linux-cli/blob/master/USAGE.md#disable-sudo-password-query)

## 2021-1-29 Announcement

I'm happy to see the new `protonvpn-cli` client offers GNOME integration which makes some functionality of this extension redundant. I intend to revise this extension to complement the new client (e.g., adding server selection, GUI settings, start on boot, etc.) in the next few weeks.

For the time being, if you are using the new `protonvpn-cli` client, I recommend disabling this extension until the next release. Otherwise, GNOME's aggregate menu will display redundant VPN status information.

---

The ProtonVPN team has implemented the ability to use `pkexec` in version 2.2.3 of the linux-cli client.

Using `pkexec` makes this guide unnecessary since it will handle the use of `sudo` on behalf of this extension. **Version 5 of this extension will allow you to switch between using `pkexec` and `sudo`. For now, you must follow the guide for the extension to work.**

## What This Extension Offers

If you want to interact with ProtonVPN the same way GNOME's network-manager handles OpenVPN, this is the extension for you.

![screenshot preview](assets/preview.png)

This extension offers a drop-down item in the user menu which will simply allow you to connect/disconnect from ProtonVPN. You will be notified when the extension starts connecting or disconnecting using the ProtonVPN linux-cli client.

## How to Install This Extension

This extension uses the ProtonVPN linux-cli tool. You will need to install it before using this extension. Please follow ProtonVPN's installation guide for your current distribution:

<https://protonvpn.com/support/linux-vpn-tool/>

Once you've done that, install and enable the extension on GNOME Extensions:

[<img src="assets/get-it-on-ego.svg?sanitize=true" alt="Get it on GNOME Extensions" height="100" align="middle">][ego]

[ego]: https://extensions.gnome.org/extension/3133/protonvpn-status/

### Manual Install

Or if you want the latest version that is not on GNOME Extensions, you can install the extension directly from this repository using the following command:

```bash
git clone git@github.com:ceiphr/gse-protonvpn-status.git /home/$USER/.local/share/gnome-shell/extensions/protonvpn-status@ceiphr.com
```

### Planned Features

<!--
Some suggestions are from here:
https://www.reddit.com/r/gnome/comments/gshaj5/a_gnome_extension_for_handling_the_protonvpn_cli/fs71jfo?utm_source=share&utm_medium=web2x
-->

| Planned Features                               |                 Feature Implemented                  |
| :--------------------------------------------- | :--------------------------------------------------: |
| Add notification to indicate connection status | <img src="assets/done.png" alt="Done" width="24px"/> |
| Change VPN notification icon to ProtonVPN mark | <img src="assets/done.png" alt="Done" width="24px"/> |
| Use `pkexec` to handle sudo commands           |                                                      |
| Add country/connection type selection support  |                                                      |
| Add autostart option in extension settings     |                                                      |
| Add GUI for changing linux-cli client settings |                                                      |

### Compatibility

This extension has been tested with GNOME 3.36.

### Credits

This extension is developed and maintained by [@ceiphr](https://github.com/ceiphr).

Significant portions of code in this extension were derived from [@bajcmartinez](https://github.com/bajcmartinez)'s [NordVPN-Status](https://github.com/bajcmartinez/nordvpn-status).

The ProtonVPN logo and mark are both registered trademarks of Proton Technologies AG.

The GNOME foot logo is a registered trademark of The GNOME Foundation.

The [checkmark icon](https://icons8.com/icons/set/checkmark) used in "Planned Features" was created by [Icons8](https://icons8.com).

Thank you to [u/ndhlms](https://www.reddit.com/user/ndhlms/) for [recommending the use of `GSubprocess` for handling status updated](https://www.reddit.com/r/gnome/comments/gqvgeu/glibspawn_command_line_sync_performance_question/frwgd5y?utm_source=share&utm_medium=web2x).

### License & Terms

ProtonVPN Status is available under the [GNU GENERAL PUBLIC LICENSE v3.0](LICENSE).

### Disclaimer

ProtonVPN is a product of Proton Technologies AG. I, [Ari Birnbaum](https://www.ceiphr.com/), am in no way affiliated with ProtonVPN, the ProtonVPN team, or Proton Technologies AG. Please determine if your issue pertains to this extension or to ProtonVPN's linux-cli client before reporting it.

Thank you for using the extension. I really appreciate it.
