import debounce from "lodash/debounce";
import { Component } from "react";
import { UAParser } from "ua-parser-js";

export const SIZE_UNKNOWN = null;
export const LANDSCAPE = "landscape";
export const PORTRAIT = "portrait";

const isClientSide = () => typeof window !== "undefined" && window.document;

const getComputedFontSize = () => {
  const cs = window.getComputedStyle(document.body, null);
  return cs.getPropertyValue("font-size");
};

interface WindowDetails {
  width: number | null;
  height: number | null;
  orientation: typeof LANDSCAPE | typeof PORTRAIT;
  defaultFontSize?: number;
  widthEm?: number;
}

interface DeviceInfo extends WindowDetails {
  screen?: WindowDetails;
}

interface DeviceProps {
  onChange: (deviceInfo: DeviceInfo) => void;
  userAgent?: string;
}

/**
 *
 */
class Device extends Component<DeviceProps> {
  static _debouncedChange: any;
  static _buildDeviceInfo(): DeviceInfo {
    const windowDetails: WindowDetails = {
      width: SIZE_UNKNOWN,
      height: SIZE_UNKNOWN,
      orientation: LANDSCAPE,
    };

    if (isClientSide()) {
      windowDetails.width =
        window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;
      windowDetails.height =
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight;
      windowDetails.orientation =
        windowDetails.width > windowDetails.height ? LANDSCAPE : PORTRAIT;
      const fontSize = getComputedFontSize();
      windowDetails.defaultFontSize = Number(fontSize.replace("px", ""));
      windowDetails.widthEm =
        windowDetails.width / windowDetails.defaultFontSize;
    }

    return {
      screen: { ...windowDetails },
      ...Device.details,
    } as DeviceInfo;
  }

  static _onChange() {
    Device._publish(Device._listeners);
  }

  static _publish(listeners: ((deviceInfo: DeviceInfo) => void)[]) {
    const deviceInfo = Device._buildDeviceInfo();
    listeners.forEach((listener) => {
      listener(deviceInfo);
    });
  }

  static _listeners: ((deviceInfo: DeviceInfo) => void)[] = [];
  static DEBOUNCE_TIME = 250;
  static details: { [key: string]: any } = {};

  constructor(props: DeviceProps) {
    super(props);
    Device.details = UAParser(props.userAgent);
    if (!Device._debouncedChange) {
      Device._debouncedChange = debounce(
        Device._onChange,
        Device.DEBOUNCE_TIME
      );
    }
    // componentDidMount is not called on server so we load device information
    // here if on the server; client-side loading will happen in componentDidMount
    // after rendering, so we know the document is loaded
    if (!isClientSide()) {
      Device._publish([props.onChange]);
    }
  }

  componentDidMount() {
    if (!Device._listeners.length) {
      window.addEventListener("resize", Device._debouncedChange, true);
    }
    Device._listeners.push(this.props.onChange);
    if (isClientSide()) {
      // at this point, it's possible that the viewport meta tag (if one on the page)
      // has not adjusted the innerWidth/innerHeight values, so delay briefly
      setTimeout(() => {
        Device._publish([this.props.onChange]);
      }, 1);
    }
  }

  componentWillUnmount() {
    const idx = Device._listeners.indexOf(this.props.onChange);
    Device._listeners.splice(idx, 1);
    if (!Device._listeners.length) {
      window.removeEventListener("resize", Device._debouncedChange, true);
    }
  }

  shouldComponentUpdate(nextProps: DeviceProps, nextState: any) {
    return this.props.onChange !== nextProps.onChange;
  }

  componentWillReceiveProps(nextProps: DeviceProps) {
    if (nextProps.onChange !== this.props.onChange) {
      const idx = Device._listeners.indexOf(this.props.onChange);
      Device._listeners.splice(idx, 1, nextProps.onChange);
    }
  }

  render() {
    return null;
  }
}

export default Device;
