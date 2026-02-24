import json
import logging
from django.utils import timezone
from core.models.rawcandata import VehicleRawData
from core.models.VehicleInfo import VehicleInfo

logger = logging.getLogger(__name__)


def process_vehicle_raw_data(data):
    """
    Process incoming CAN data from MQTT topic kg_dash/{VCU_ID}/can-data
    and save to the VehicleRawData hypertable.

    ESP32 JSON structure (v4.0.0-COMMERCIAL):
    {
        "VCU_ID": "A4CF12345678",
        "valid": true,
        "ts": 12345678,
        "pktCount": 42,
        "MD": { ... },   "MF": { ... },   "BMS": { ... },   "SYS": { ... }
    }
    """
    try:
        # ── 0. Parse input ──────────────────────────────────────────────
        if isinstance(data, (str, bytes)):
            try:
                data = json.loads(data)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
                return None

        if not isinstance(data, dict):
            logger.error(f"Expected dict after parsing, got {type(data)}")
            return None

        # ── 1. Resolve VCU_ID ───────────────────────────────────────────
        vcu_id = str(data.get("VCU_ID", "")).strip()
        if not vcu_id:
            logger.error("Missing VCU_ID in CAN data payload")
            return None

        # ── 2. Resolve VIN ──────────────────────────────────────────────
        vin = f"UNKNOWN_{vcu_id}"
        try:
            vehicle_info = VehicleInfo.objects.get(vcu_id=vcu_id)
            vin = vehicle_info.vin
            logger.debug(f"VIN resolved: {vin} → VCU: {vcu_id}")
        except VehicleInfo.DoesNotExist:
            logger.error(f"VCU_ID '{vcu_id}' not found in VehicleInfo table")

        # ── 3. Extract nested sections ──────────────────────────────────
        md       = data.get("MD",  {})
        mf       = data.get("MF",  {})
        bms      = data.get("BMS", {})
        sys_data = data.get("SYS", {})

        # ── 4. Type-safe helpers ────────────────────────────────────────
        def safe_float(value, default=0.0):
            if value is None or value == "":
                return default
            try:
                return float(value)
            except (ValueError, TypeError):
                return default

        def safe_int(value, default=0):
            if value is None or value == "":
                return default
            try:
                return int(float(value))
            except (ValueError, TypeError):
                return default

        def safe_bool(value, default=False):
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.strip().lower() == 'true'
            return bool(value) if value is not None else default

        def safe_str(value, default=""):
            if value is None:
                return default
            return str(value).strip() or default

        # ── 5. Create DB entry ──────────────────────────────────────────
        entry = VehicleRawData.objects.create(

            vin=vin,
            vcu_id=vcu_id,
            time=timezone.now(),

            # ============================================================
            # MOTOR DRIVE (MD)
            # ============================================================
            throttle_twist=safe_int(md.get("TT")),
            regen_energy=safe_float(md.get("RE")),
            regen_level=safe_int(md.get("RL")),
            motor_efficiency=safe_float(md.get("ME")),
            energy_consumption=safe_float(md.get("EC")),
            input_current=safe_float(md.get("IC")),
            motor_direction=safe_int(md.get("D")),
            vehicle_speed=safe_int(md.get("VS")),
            controller_temperature=safe_int(md.get("CT")),
            motor_temperature=safe_int(md.get("MT")),
            odometer=safe_float(md.get("OD")),
            vehicle_mode=safe_int(md.get("VM")),        # 0=Eco 1=Normal 2=Sport  (NOT mf["VM"])
            controller_fault=safe_int(md.get("CFL")),
            capacitor_battery_voltage=safe_float(md.get("CBV")),
            rms_current=safe_float(md.get("RCA")),
            motor_rpm=safe_int(md.get("RPM")),
            throttle_command=safe_int(md.get("TCP")),
            motor_torque=safe_int(md.get("MTN")),
            battery_current=safe_float(md.get("BCAE")),  # motor-controller side current
            throttle_voltage=safe_float(md.get("TV")),
            hall_error_motor=safe_int(md.get("HEM")),

            # MD f1 fault flags
            brake_actuation=safe_int(md.get("BA")),
            ready_signal=safe_int(md.get("RS")),
            side_stand_actuation=safe_int(md.get("SSA")),
            hill_hold_actuation=safe_int(md.get("HHA")),
            regen_mode_actuation=safe_int(md.get("RMA")),
            cruise_control=safe_int(md.get("CC")),       # f1 & 0x20  (NOT sys["CC"])

            # MD f2 fault flags
            throttle_error=safe_int(md.get("TE")),
            under_voltage_fault=safe_int(md.get("UVF")),
            motor_stall_fault=safe_int(md.get("MSF")),
            phase_missing=safe_int(md.get("PM")),
            controller_temp_fault=safe_int(md.get("CTF")),

            # ============================================================
            # MOTOR FAULTS (MF)
            # ============================================================
            fault_codes=safe_int(mf.get("FCG")),

            # df1 byte
            hardware_over_current=safe_int(mf.get("HOCF")),
            over_current_baseline_fault=safe_int(mf.get("OCSC")),
            hardware_over_voltage=safe_int(mf.get("HWOV")),
            over_temperature_fault=safe_int(mf.get("OTF")),
            motor_overtemperature=safe_int(mf.get("MOT")),
            motor_overload=safe_int(mf.get("MOS")),      # df1 & 0x20  (CSV col: motor_overload)
            motor_output_phase_loss=safe_int(mf.get("MOPL")),
            motor_overspeeding=safe_int(mf.get("MO")),

            # df2 byte
            sw_over_voltage=safe_int(mf.get("SWOV")),
            sw_over_current=safe_int(mf.get("SWOC")),
            dc_bus_under_voltage=safe_int(mf.get("DCBUV")),
            can_communication_failure=safe_int(mf.get("CCF")),
            encoder_oor_fault=safe_int(mf.get("EOF")),
            vin_mismatch_fault=safe_int(mf.get("VM")),   # df2 & 0x20  (NOT md["VM"])

            # Static MF fields (always 0 from ESP32; reserved for future)
            precharge_fault=safe_int(mf.get("PRE")),
            drive_power_under_voltage=safe_int(mf.get("DPUV")),
            mcu_temp_sensor_disconnection=safe_int(mf.get("MTD")),
            motor_phase_short_to_battery=safe_int(mf.get("MPSTB")),
            temp_sensor_fault=safe_int(mf.get("TSF")),
            motor_phase_short_to_ground=safe_int(mf.get("MPSG")),
            u_phase_abnormal=safe_int(mf.get("UPA")),
            v_phase_abnormal=safe_int(mf.get("VPA")),
            w_phase_abnormal=safe_int(mf.get("WPA")),
            u_phase_disconnection=safe_int(mf.get("UPD")),
            v_phase_disconnection=safe_int(mf.get("VPD")),
            w_phase_disconnection=safe_int(mf.get("WPD")),
            encoder_disconnection=safe_int(mf.get("ED")),
            gear_direction_reverse=safe_int(mf.get("GDR")),
            all_input_exceed_limit=safe_int(mf.get("AIE")),
            drive_protection=safe_int(mf.get("DP")),
            drive_overload=safe_int(mf.get("DO")),
            motor_parameter_tuning=safe_int(mf.get("MPT")),
            controller_drive_abnormal=safe_int(mf.get("CDA")),
            board_sw_check_limit=safe_int(mf.get("BSWCL")),
            power_supply_drive_limit=safe_int(mf.get("PSDL")),
            drive_enable_high_speed=safe_int(mf.get("DEHS")),

            # ============================================================
            # BMS
            # ============================================================
            battery_pack_voltage=safe_float(bms.get("PV")),
            voltage_battery=safe_float(bms.get("PV")),   # legacy duplicate column - same value
            discharge_time_estimate=safe_int(bms.get("DTE")),
            battery_health=safe_int(bms.get("BH", 100)),
            battery_temperature=safe_float(bms.get("BT")),
            soc_battery_pack=safe_float(bms.get("SOC")),
            available_energy=safe_float(bms.get("AE")),
            current_battery=safe_float(bms.get("PC")),   # BMS-reported current

            # BMS error flags
            over_voltage_error=safe_int(bms.get("EOV")),
            under_voltage_error=safe_int(bms.get("EUV")),
            over_temperature_error=safe_int(bms.get("EOT")),
            under_temperature_error=safe_int(bms.get("EUT")),
            pack_not_connected_error=safe_int(bms.get("EPNC")),
            soc_less_10_error=safe_int(bms.get("ESL10")),
            soc_less_5_error=safe_int(bms.get("ESC5")),
            thermal_runaway_error=safe_int(bms.get("TRE")),

            # ============================================================
            # SYSTEM / CONTROL (SYS)
            # ============================================================
            is_active=safe_int(sys_data.get("IA")),
            connection_count=safe_int(sys_data.get("CC")),  # integer count (NOT md["CC"] cruise_control)
            can_interface_mode=safe_int(sys_data.get("CIM")),
            vehicle_state=safe_str(sys_data.get("VST"), default="OK"),
            gear_operation=safe_str(sys_data.get("GO"),  default="NORMAL"),
            brake_drive=safe_str(sys_data.get("BAD"),    default="NORMAL"),
            diagnostic_trouble_code=safe_int(sys_data.get("DTC")),
            headlight=safe_int(sys_data.get("HL")),
            hazard=safe_int(sys_data.get("HZ")),
            lock=safe_int(sys_data.get("LK")),
            side_light=safe_int(sys_data.get("SL")),
            power=safe_int(sys_data.get("PW")),
            horn=safe_int(sys_data.get("HN")),
            immobilizer=safe_int(sys_data.get("IM")),

            # ============================================================
            # METADATA
            # ============================================================
            is_valid=safe_bool(data.get("valid", False)),
            device_timestamp=safe_int(data.get("ts", 0)),
            packet_count=safe_int(data.get("pktCount", 0)),
        )

        logger.info(
            f"CAN data saved → ID={entry.id} VIN={vin} VCU={vcu_id} "
            f"Speed={entry.vehicle_speed} km/h SOC={entry.soc_battery_pack}% "
            f"Mode={entry.vehicle_mode} Odo={entry.odometer} km"
        )
        return entry

    except Exception as e:
        logger.error(f"Error processing CAN data: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None