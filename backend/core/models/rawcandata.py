from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

# pip install django-timescaledb
from timescale.db.models.models import TimescaleModel
from timescale.db.models.fields import TimescaleDateTimeField
from timescale.db.models.managers import TimescaleManager


# ==============================================================================
# TIME-SERIES MODELS (TimescaleDB Hypertables)
#
# Column source of truth: data-1771829393791.csv  (106 columns, verified)
#
# Physical DB column for partition key is 'timestamp'.
# Django ORM attribute is 'time' (required by TimescaleModel).
# db_column='timestamp' bridges these without any migration.
#
# To rename the physical column later (optional):
#   ALTER TABLE core_vehiclerawdata RENAME COLUMN timestamp TO time;
#   Then remove db_column='timestamp' below.
# ==============================================================================


class VehicleRawData(TimescaleModel):
    """
    TimescaleDB Hypertable for high-frequency CAN bus telematics data.
    Topic  : kg_dash/{VCU_ID}/can-data
    Chunk  : 1 day
    Source : ESP32 v4.0.0-COMMERCIAL via MQTT

    Column order matches the real DB / CSV export exactly.
    """

    # ------------------------------------------------------------------
    # PARTITION KEY  (physical column = 'timestamp')
    # ------------------------------------------------------------------
    time = TimescaleDateTimeField(
        interval="1 days",
        db_column='timestamp',
        default=timezone.now
    )

    objects = TimescaleManager()

    # ------------------------------------------------------------------
    # IDENTITY
    # ------------------------------------------------------------------
    vin    = models.CharField(max_length=50)
    vcu_id = models.CharField(max_length=100, default="Unknown")

    # ==================================================================
    # MOTOR DRIVE (MD)
    # ESP32 key  →  field name
    # ==================================================================
    throttle_twist            = models.IntegerField(default=0)   # md["TT"]
    regen_energy              = models.FloatField(default=0.0)   # md["RE"]
    regen_level               = models.IntegerField(default=0)   # md["RL"]
    motor_efficiency          = models.FloatField(default=0.0)   # md["ME"]
    energy_consumption        = models.FloatField(default=0.0)   # md["EC"]
    input_current             = models.FloatField(default=0.0)   # md["IC"]
    motor_direction           = models.IntegerField(default=0)   # md["D"]
    vehicle_speed             = models.IntegerField(default=0)   # md["VS"]
    controller_temperature    = models.IntegerField(default=0)   # md["CT"]
    motor_temperature         = models.IntegerField(default=0)   # md["MT"]
    odometer                  = models.FloatField(default=0.0)   # md["OD"]   km
    vehicle_mode              = models.IntegerField(default=0)   # md["VM"]   0=Eco 1=Normal 2=Sport
    controller_fault          = models.IntegerField(default=0)   # md["CFL"]
    capacitor_battery_voltage = models.FloatField(default=0.0)   # md["CBV"]  V
    rms_current               = models.FloatField(default=0.0)   # md["RCA"]  A
    motor_rpm                 = models.IntegerField(default=0)   # md["RPM"]
    throttle_command          = models.IntegerField(default=0)   # md["TCP"]
    motor_torque              = models.IntegerField(default=0)   # md["MTN"]

    # MD fault flags — f1 byte
    brake_actuation           = models.IntegerField(default=0)   # md["BA"]   f1 & 0x01
    ready_signal              = models.IntegerField(default=0)   # md["RS"]   f1 & 0x02
    side_stand_actuation      = models.IntegerField(default=0)   # md["SSA"]  f1 & 0x04
    hill_hold_actuation       = models.IntegerField(default=0)   # md["HHA"]  f1 & 0x08
    regen_mode_actuation      = models.IntegerField(default=0)   # md["RMA"]  f1 & 0x10
    cruise_control            = models.IntegerField(default=0)   # md["CC"]   f1 & 0x20  ← NOT sys["CC"]

    # MD fault flags — f2 byte
    throttle_error            = models.IntegerField(default=0)   # md["TE"]   f2 & 0x01
    under_voltage_fault       = models.IntegerField(default=0)   # md["UVF"]  f2 & 0x04
    motor_stall_fault         = models.IntegerField(default=0)   # md["MSF"]  f2 & 0x08
    phase_missing             = models.IntegerField(default=0)   # md["PM"]   f2 & 0x10
    controller_temp_fault     = models.IntegerField(default=0)   # md["CTF"]  f2 & 0x20

    hall_error_motor          = models.IntegerField(default=0)   # md["HEM"]
    battery_current           = models.FloatField(default=0.0)   # md["BCAE"] A  motor-controller side
    throttle_voltage          = models.FloatField(default=0.0)   # md["TV"]   V

    # ==================================================================
    # MOTOR FAULTS (MF)
    # ==================================================================

    # Static / future-use faults (always 0 from ESP32 currently)
    precharge_fault               = models.IntegerField(default=0)  # mf["PRE"]
    drive_power_under_voltage     = models.IntegerField(default=0)  # mf["DPUV"]
    mcu_temp_sensor_disconnection = models.IntegerField(default=0)  # mf["MTD"]
    motor_phase_short_to_battery  = models.IntegerField(default=0)  # mf["MPSTB"]
    motor_overload                = models.IntegerField(default=0)  # mf["MOS"]  df1 & 0x20
    temp_sensor_fault             = models.IntegerField(default=0)  # mf["TSF"]
    motor_phase_short_to_ground   = models.IntegerField(default=0)  # mf["MPSG"]
    u_phase_abnormal              = models.IntegerField(default=0)  # mf["UPA"]
    v_phase_abnormal              = models.IntegerField(default=0)  # mf["VPA"]
    w_phase_abnormal              = models.IntegerField(default=0)  # mf["WPA"]
    u_phase_disconnection         = models.IntegerField(default=0)  # mf["UPD"]
    v_phase_disconnection         = models.IntegerField(default=0)  # mf["VPD"]
    w_phase_disconnection         = models.IntegerField(default=0)  # mf["WPD"]
    encoder_disconnection         = models.IntegerField(default=0)  # mf["ED"]
    gear_direction_reverse        = models.IntegerField(default=0)  # mf["GDR"]
    all_input_exceed_limit        = models.IntegerField(default=0)  # mf["AIE"]
    drive_protection              = models.IntegerField(default=0)  # mf["DP"]
    drive_overload                = models.IntegerField(default=0)  # mf["DO"]
    motor_parameter_tuning        = models.IntegerField(default=0)  # mf["MPT"]
    controller_drive_abnormal     = models.IntegerField(default=0)  # mf["CDA"]
    board_sw_check_limit          = models.IntegerField(default=0)  # mf["BSWCL"]
    power_supply_drive_limit      = models.IntegerField(default=0)  # mf["PSDL"]
    drive_enable_high_speed       = models.IntegerField(default=0)  # mf["DEHS"]

    # Active faults from binary packet
    fault_codes               = models.IntegerField(default=0)   # mf["FCG"]  pkt.fltGen

    # df1 byte faults
    hardware_over_current     = models.IntegerField(default=0)   # mf["HOCF"] df1 & 0x01
    over_current_baseline_fault = models.IntegerField(default=0) # mf["OCSC"] df1 & 0x02
    hardware_over_voltage     = models.IntegerField(default=0)   # mf["HWOV"] df1 & 0x04
    over_temperature_fault    = models.IntegerField(default=0)   # mf["OTF"]  df1 & 0x08
    motor_overtemperature     = models.IntegerField(default=0)   # mf["MOT"]  df1 & 0x10
    motor_overspeeding        = models.IntegerField(default=0)   # mf["MO"]   df1 & 0x80
    motor_output_phase_loss   = models.IntegerField(default=0)   # mf["MOPL"] df1 & 0x40

    # df2 byte faults
    sw_over_voltage           = models.IntegerField(default=0)   # mf["SWOV"] df2 & 0x01
    sw_over_current           = models.IntegerField(default=0)   # mf["SWOC"] df2 & 0x02
    dc_bus_under_voltage      = models.IntegerField(default=0)   # mf["DCBUV"]df2 & 0x04
    can_communication_failure = models.IntegerField(default=0)   # mf["CCF"]  df2 & 0x08
    encoder_oor_fault         = models.IntegerField(default=0)   # mf["EOF"]  df2 & 0x10
    vin_mismatch_fault        = models.IntegerField(default=0)   # mf["VM"]   df2 & 0x20  ← NOT md["VM"]

    # ==================================================================
    # BMS (Battery Management System)
    # ==================================================================
    battery_pack_voltage      = models.FloatField(default=0.0)   # bms["PV"]   V  (pkt.bmsV / 10.0)
    discharge_time_estimate   = models.IntegerField(default=0)   # bms["DTE"]  km
    battery_health            = models.IntegerField(default=100) # bms["BH"]   %
    battery_temperature       = models.FloatField(default=0.0)   # bms["BT"]   °C
    soc_battery_pack          = models.FloatField(default=0.0)   # bms["SOC"]  %
    available_energy          = models.FloatField(default=0.0)   # bms["AE"]   Wh

    # NOTE: voltage_battery and battery_pack_voltage both exist in the DB.
    # battery_pack_voltage = bms["PV"] = pkt.bmsV / 10.0
    # voltage_battery      = bms["PV"] duplicate stored by the processor (legacy).
    # Both are kept to match the real DB schema. Do NOT remove voltage_battery.
    voltage_battery           = models.FloatField(default=0.0)   # bms["PV"]   duplicate (legacy column)

    current_battery           = models.FloatField(default=0.0)   # bms["PC"]   A  (pkt.bmsI / 10.0)

    # BMS error flags
    over_voltage_error        = models.IntegerField(default=0)   # bms["EOV"]   bmsErr & 0x01
    under_voltage_error       = models.IntegerField(default=0)   # bms["EUV"]   bmsErr & 0x02
    over_temperature_error    = models.IntegerField(default=0)   # bms["EOT"]   bmsErr & 0x04
    under_temperature_error   = models.IntegerField(default=0)   # bms["EUT"]   bmsErr & 0x08
    pack_not_connected_error  = models.IntegerField(default=0)   # bms["EPNC"]  bmsErr & 0x10
    soc_less_10_error         = models.IntegerField(default=0)   # bms["ESL10"] bmsErr & 0x20
    soc_less_5_error          = models.IntegerField(default=0)   # bms["ESC5"]  bmsErr & 0x40
    thermal_runaway_error     = models.IntegerField(default=0)   # bms["TRE"]   f3 & 0x01

    # ==================================================================
    # SYSTEM (SYS) / CONTROL STATES
    # ==================================================================
    is_active                 = models.IntegerField(default=0)   # sys["IA"]  f3 & 0x02
    connection_count          = models.IntegerField(default=0)   # sys["CC"]  integer  ← NOT md["CC"]
    can_interface_mode        = models.IntegerField(default=0)   # sys["CIM"]
    vehicle_state             = models.CharField(max_length=20, default="OK")     # sys["VST"]
    gear_operation            = models.CharField(max_length=20, default="NORMAL") # sys["GO"]
    brake_drive               = models.CharField(max_length=20, default="NORMAL") # sys["BAD"]
    diagnostic_trouble_code   = models.IntegerField(default=0)   # sys["DTC"]
    headlight                 = models.IntegerField(default=0)   # sys["HL"]
    hazard                    = models.IntegerField(default=0)   # sys["HZ"]
    lock                      = models.IntegerField(default=0)   # sys["LK"]
    side_light                = models.IntegerField(default=0)   # sys["SL"]
    power                     = models.IntegerField(default=0)   # sys["PW"]
    horn                      = models.IntegerField(default=0)   # sys["HN"]
    immobilizer               = models.IntegerField(default=0)   # sys["IM"]

    # ==================================================================
    # METADATA
    # ==================================================================
    is_valid         = models.BooleanField(default=False)        # data["valid"]
    device_timestamp = models.BigIntegerField(default=0)         # data["ts"]       ESP32 millis()
    packet_count     = models.IntegerField(default=0)            # data["pktCount"]

    class Meta:
        verbose_name        = "Vehicle Raw Data"
        verbose_name_plural = "Vehicle Raw Data"
        ordering            = ['-time']
        indexes = [
            models.Index(fields=['vcu_id', '-time']),
            models.Index(fields=['vin',    '-time']),
        ]

    def __str__(self):
        return (
            f"{self.vin} ({self.vcu_id}) @ {self.time} | "
            f"Speed={self.vehicle_speed} km/h  SOC={self.soc_battery_pack}%"
        )


# ==============================================================================

class AccessLog(TimescaleModel):
    """
    Hypertable for system access logs.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='access_logs')
    action = models.CharField(max_length=50)
    resource = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100, blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    success = models.BooleanField(default=True)
    details = models.TextField(blank=True, null=True)
    time = models.DateTimeField(default=timezone.now)
    
    class Meta:
        verbose_name = "Access Log"
        verbose_name_plural = "Access Logs"
        ordering = ['-time']
    
    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.time}"