# Measure user prompt
import re

text = """
IoThings Home Automation Solutions is a UK-based enterprise that designs, installs and manages connected smart-home sensors and automation actuators. Its enterprise resource planning (ERP), customer relationship management (CRM), inventory and utility billing systems run on relational database management systems. Relational engines excel at structured business transactions governed by ACID invariants, but they face operational friction when asked to absorb a continuous, high-velocity, append-heavy stream of device telemetry whose schema changes whenever microcontrollers receive over-the-air firmware updates.

This report evaluates MongoDB, a distributed document-oriented NoSQL database, as a dedicated telemetry storage and automation engine for IoThings. The operational prototype models a rooftop water tank subsystem. A hardware hub, HOME_HUB_01, samples an ultrasonic depth sensor and two safety float switches, and it controls an inlet refill valve and a pressurised booster pump. The prototype represents a standard 2,000-litre household reservoir that is 200 cm high.
"""
print('Word count of snippet:', len(text.split()))
