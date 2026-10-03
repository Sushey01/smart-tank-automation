import os
import sys
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Initialize presentation with 16:9 widescreen layout
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

# --- Color Definitions ---
COLOR_NAVY_DARK = RGBColor(15, 23, 42)      # #0F172A - Deep background
COLOR_NAVY_SURFACE = RGBColor(30, 41, 59)   # #1E293B - Card on dark
COLOR_LIGHT_BG = RGBColor(248, 250, 252)    # #F8FAFC - Main content bg
COLOR_WHITE = RGBColor(255, 255, 255)       # #FFFFFF - White card bg
COLOR_BORDER = RGBColor(226, 232, 240)      # #E2E8F0 - Subtle border
COLOR_CARD_SHADOW = RGBColor(241, 245, 249) # #F1F5F9 - Fill
COLOR_TEXT_MAIN = RGBColor(15, 23, 42)      # #0F172A - Main dark text
COLOR_TEXT_BODY = RGBColor(51, 65, 85)      # #334155 - Standard body text
COLOR_TEXT_MUTED = RGBColor(100, 116, 139)  # #64748B - Muted / Subtitle
COLOR_ACCENT_BLUE = RGBColor(2, 132, 199)   # #0284C7 - Primary Brand Blue
COLOR_ACCENT_TEAL = RGBColor(13, 148, 136)  # #0D9488 - Secondary Brand Teal
COLOR_ACCENT_GREEN = RGBColor(22, 163, 74)  # #16A34A - Success Green
COLOR_ACCENT_AMBER = RGBColor(217, 119, 6)  # #D97706 - Warning Amber
COLOR_PILL_BG = RGBColor(238, 242, 255)     # #EEF2FF - Light badge pill
COLOR_PILL_TEXT = RGBColor(67, 56, 202)     # #4338CA - Badge text

FONT_HEADING = "Segoe UI"
FONT_BODY = "Segoe UI"

def set_slide_background(slide, color):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = color
    bg.line.fill.background()
    return bg

def add_header(slide, title_text, category_text, slide_num=None):
    # Category Pill / Super-title
    if category_text:
        pill = slide.shapes.add_textbox(Inches(0.8), Inches(0.38), Inches(8.0), Inches(0.32))
        tf_pill = pill.text_frame
        tf_pill.word_wrap = True
        tf_pill.margin_left = tf_pill.margin_right = tf_pill.margin_top = tf_pill.margin_bottom = 0
        p_pill = tf_pill.paragraphs[0]
        p_pill.text = category_text.upper()
        p_pill.font.name = FONT_HEADING
        p_pill.font.size = Pt(9.5)
        p_pill.font.bold = True
        p_pill.font.color.rgb = COLOR_ACCENT_BLUE

    # Main Slide Title
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.68), Inches(10.5), Inches(0.6))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = title_text
    p.font.name = FONT_HEADING
    p.font.size = Pt(21)
    p.font.bold = True
    p.font.color.rgb = COLOR_TEXT_MAIN

    # Slide number badge top right
    if slide_num:
        badge = slide.shapes.add_textbox(Inches(11.3), Inches(0.42), Inches(1.2), Inches(0.4))
        tf_badge = badge.text_frame
        tf_badge.margin_left = tf_badge.margin_right = tf_badge.margin_top = tf_badge.margin_bottom = 0
        p_b = tf_badge.paragraphs[0]
        p_b.alignment = PP_ALIGN.RIGHT
        p_b.text = f"{slide_num:02d} / 15"
        p_b.font.name = FONT_HEADING
        p_b.font.size = Pt(11)
        p_b.font.bold = True
        p_b.font.color.rgb = COLOR_TEXT_MUTED

def add_card(slide, left, top, width, height, bg_color=COLOR_WHITE, border_color=COLOR_BORDER):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    if border_color:
        card.line.color.rgb = border_color
        card.line.width = Pt(1.0)
    else:
        card.line.fill.background()
    return card

def add_padded_textbox(slide, card_left, card_top, card_width, card_height, pad_h=Inches(0.3), pad_v=Inches(0.24)):
    """Creates a textbox nested within a card with generous internal padding so text never clips rounded corners."""
    tb = slide.shapes.add_textbox(
        card_left + pad_h,
        card_top + pad_v,
        card_width - (pad_h * 2),
        card_height - (pad_v * 2)
    )
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.04)
    tf.margin_right = Inches(0.04)
    tf.margin_top = Inches(0.04)
    tf.margin_bottom = Inches(0.04)
    return tf

def add_stat_card(slide, left, top, width, height, metric, label, subtext="", border_color=COLOR_ACCENT_BLUE):
    card = add_card(slide, left, top, width, height, bg_color=COLOR_WHITE, border_color=border_color)
    tf = add_padded_textbox(slide, left, top, width, height, pad_h=Inches(0.15), pad_v=Inches(0.12))
    
    p0 = tf.paragraphs[0]
    p0.text = str(metric)
    p0.font.name = FONT_HEADING
    p0.font.size = Pt(22)
    p0.font.bold = True
    p0.font.color.rgb = border_color
    p0.alignment = PP_ALIGN.CENTER
    
    p1 = tf.add_paragraph()
    p1.text = label
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(10)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_TEXT_MAIN
    p1.alignment = PP_ALIGN.CENTER
    p1.space_before = Pt(2)

    if subtext:
        p2 = tf.add_paragraph()
        p2.text = subtext
        p2.font.name = FONT_BODY
        p2.font.size = Pt(8.5)
        p2.font.color.rgb = COLOR_TEXT_MUTED
        p2.alignment = PP_ALIGN.CENTER
        p2.space_before = Pt(1)

def add_image_card(slide, img_path, left, top, width, height, title="", subtitle=""):
    """Adds a container card with an authentic user screenshot scaled properly with generous internal padding."""
    card = add_card(slide, left, top, width, height, bg_color=COLOR_WHITE, border_color=COLOR_BORDER)
    
    y_cursor = top + Inches(0.16)
    if title:
        tb = slide.shapes.add_textbox(left + Inches(0.25), y_cursor, width - Inches(0.5), Inches(0.35))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = COLOR_TEXT_MAIN
        
        if subtitle:
            p2 = tf.add_paragraph()
            p2.text = subtitle
            p2.font.name = FONT_BODY
            p2.font.size = Pt(8.5)
            p2.font.color.rgb = COLOR_TEXT_MUTED
            p2.space_before = Pt(1)
            y_cursor += Inches(0.44)
        else:
            y_cursor += Inches(0.32)
            
    # Calculate available space for image with breathing room
    img_avail_w = width - Inches(0.44)
    img_avail_h = (top + height) - y_cursor - Inches(0.14)
    
    if os.path.exists(img_path):
        im = Image.open(img_path)
        im_w, im_h = im.size
        scale = min(img_avail_w / Inches(im_w / 96.0), img_avail_h / Inches(im_h / 96.0))
        final_w = Inches(im_w / 96.0) * scale
        final_h = Inches(im_h / 96.0) * scale
        
        # Center image within card
        img_left = left + (width - final_w) / 2.0
        img_top = y_cursor + (img_avail_h - final_h) / 2.0
        
        slide.shapes.add_picture(img_path, img_left, img_top, width=final_w, height=final_h)

def set_speaker_notes(slide, notes_text):
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = notes_text

# ==============================================================================
# SLIDE 1: Title Slide (Dark Theme)
# ==============================================================================
slide1 = prs.slides.add_slide(blank_layout)
set_slide_background(slide1, COLOR_NAVY_DARK)

tb_cat = slide1.shapes.add_textbox(Inches(1.0), Inches(1.15), Inches(11.333), Inches(0.4))
tf_cat = tb_cat.text_frame
p_cat = tf_cat.paragraphs[0]
p_cat.text = "CMP6207 MODERN DATA STORES  •  FINAL TECHNICAL PROJECT PRESENTATION"
p_cat.font.name = FONT_HEADING
p_cat.font.size = Pt(11.5)
p_cat.font.bold = True
p_cat.font.color.rgb = COLOR_ACCENT_BLUE

tb_title = slide1.shapes.add_textbox(Inches(1.0), Inches(1.65), Inches(11.333), Inches(2.3))
tf_title = tb_title.text_frame
tf_title.word_wrap = True
p_t = tf_title.paragraphs[0]
p_t.text = "Smart Tank Automation"
p_t.font.name = FONT_HEADING
p_t.font.size = Pt(38)
p_t.font.bold = True
p_t.font.color.rgb = COLOR_WHITE

p_sub = tf_title.add_paragraph()
p_sub.text = "A Distributed, Fault-Tolerant NoSQL Telemetry Platform for IoThings Home Automation"
p_sub.font.name = FONT_HEADING
p_sub.font.size = Pt(19)
p_sub.font.color.rgb = RGBColor(148, 163, 184)
p_sub.space_before = Pt(10)

div = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(4.25), Inches(11.333), Inches(0.04))
div.fill.solid()
div.fill.fore_color.rgb = COLOR_ACCENT_TEAL
div.line.fill.background()

tb_info = slide1.shapes.add_textbox(Inches(1.0), Inches(4.55), Inches(8.5), Inches(2.2))
tf_info = tb_info.text_frame
tf_info.word_wrap = True

def add_meta_line(tf, label, value):
    p = tf.add_paragraph() if tf.paragraphs[0].text else tf.paragraphs[0]
    r1 = p.add_run()
    r1.text = f"{label:<22}"
    r1.font.bold = True
    r1.font.size = Pt(11.5)
    r1.font.color.rgb = RGBColor(226, 232, 240)
    r2 = p.add_run()
    r2.text = value
    r2.font.size = Pt(11.5)
    r2.font.color.rgb = RGBColor(148, 163, 184)
    p.space_after = Pt(4)

add_meta_line(tf_info, "Student Name:", "Shekhar Lamichhane Magar")
add_meta_line(tf_info, "Student ID:", "23189647")
add_meta_line(tf_info, "Programme:", "BSc (Hons) Computer and Data Science")
add_meta_line(tf_info, "Institution:", "Birmingham City University — Faculty of CEBE")
add_meta_line(tf_info, "Assessment:", "CMP6207 Coursework Report & Technical Presentation")

if os.path.exists("logo.png"):
    slide1.shapes.add_picture("logo.png", Inches(9.8), Inches(4.75), width=Inches(2.5))

set_speaker_notes(slide1, 
    "Good morning everyone. My name is Shekhar Lamichhane Magar, Student ID 23189647. "
    "Today I am presenting my final technical project for CMP6207 Modern Data Stores: "
    "'Smart Tank Automation: A Distributed, Fault-Tolerant NoSQL Telemetry Platform for IoThings Home Automation Solutions'. "
    "In this presentation, I will walk you through the architectural motivation for choosing MongoDB, "
    "the design of our distributed cluster, empirical indexing and failover benchmarks, and the production roadmap."
)

# ==============================================================================
# SLIDE 2: Executive Summary & Business Context
# ==============================================================================
slide2 = prs.slides.add_slide(blank_layout)
set_slide_background(slide2, COLOR_LIGHT_BG)
add_header(slide2, "Executive Summary: Business Problem & NoSQL Fit", "Enterprise Context", 2)

# Card 1: Enterprise Problem (Generous internal padding)
c1 = add_card(slide2, Inches(0.8), Inches(1.45), Inches(5.65), Inches(4.3))
tf1 = add_padded_textbox(slide2, Inches(0.8), Inches(1.45), Inches(5.65), Inches(4.3), pad_h=Inches(0.32), pad_v=Inches(0.28))

p = tf1.paragraphs[0]
p.text = "The Business Problem at IoThings"
p.font.name = FONT_HEADING
p.font.size = Pt(14.5)
p.font.bold = True
p.font.color.rgb = COLOR_TEXT_MAIN

bullets1 = [
    ("Connected Smart-Home Provider: ", "IoThings designs and manages domestic sensors and actuators (rooftop water tanks, booster pumps, valves)."),
    ("Relational System Friction: ", "Existing ERP and billing run on RDBMS. While great for ACID banking, RDBMS suffers friction under high-velocity append streams."),
    ("Firmware Schema Drift: ", "OTA firmware updates alter JSON payloads (adding TDS/pH water quality), triggering disruptive ALTER TABLE DDL locks."),
    ("Polyglot Persistence Strategy: ", "Retain relational engines for accounts and billing; deploy MongoDB as a dedicated telemetry and automation tier.")
]
for bold_prefix, text in bullets1:
    p = tf1.add_paragraph()
    p.space_before = Pt(5)
    r1 = p.add_run()
    r1.text = "• " + bold_prefix
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = COLOR_ACCENT_BLUE
    r2 = p.add_run()
    r2.text = text
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = COLOR_TEXT_BODY

# Card 2: 3 Core Pillars of Adoption (Generous internal padding)
c2 = add_card(slide2, Inches(6.8), Inches(1.45), Inches(5.75), Inches(4.3))
tf2 = add_padded_textbox(slide2, Inches(6.8), Inches(1.45), Inches(5.75), Inches(4.3), pad_h=Inches(0.32), pad_v=Inches(0.28))

p = tf2.paragraphs[0]
p.text = "Three Core Pillars for MongoDB Adoption"
p.font.name = FONT_HEADING
p.font.size = Pt(14.5)
p.font.bold = True
p.font.color.rgb = COLOR_TEXT_MAIN

pillars = [
    ("1. Schema Agility Without Migrations", "Heterogeneous payloads (v2.4.1 vs v2.5.0 with TDS/pH) coexist seamlessly in the same collection without schema locks or sparse columns."),
    ("2. 105x Query Latency Acceleration", "Applying Equality-Sort-Range compound indexing cuts retrieval from 105 ms down to 1 ms on 30,985 records with zero in-memory sort."),
    ("3. Zero Lost Acknowledged Writes", "A 3-member replica set (rs0) with majority write concern guarantees zero data loss through primary hardware termination.")
]
for title, desc in pillars:
    p = tf2.add_paragraph()
    p.space_before = Pt(6)
    r1 = p.add_run()
    r1.text = title + "\n"
    r1.font.bold = True
    r1.font.size = Pt(10.5)
    r1.font.color.rgb = COLOR_ACCENT_TEAL
    r2 = p.add_run()
    r2.text = desc
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = COLOR_TEXT_BODY

# Stat Strip at bottom
add_stat_card(slide2, Inches(0.8), Inches(5.95), Inches(2.7), Inches(1.05), "2,000 L", "Smart Tank Model", "200 cm rooftop reservoir", COLOR_ACCENT_BLUE)
add_stat_card(slide2, Inches(3.7), Inches(5.95), Inches(2.7), Inches(1.05), "1 ms", "Latest Query Latency", "Down from 105 ms (105x)", COLOR_ACCENT_TEAL)
add_stat_card(slide2, Inches(6.6), Inches(5.95), Inches(2.7), Inches(1.05), "0 Lost Writes", "Replica Failover", "Tested under kill -9", COLOR_ACCENT_GREEN)
add_stat_card(slide2, Inches(9.5), Inches(5.95), Inches(3.05), Inches(1.05), "21 / 21", "Test Suite Passed", "100% verification rate", COLOR_ACCENT_BLUE)

set_speaker_notes(slide2,
    "IoThings Home Automation Solutions is an enterprise managing connected smart home hardware. "
    "Their core problem was that their existing relational databases struggled with the high write velocity and "
    "evolving JSON schemas of IoT sensors. Whenever microcontrollers received an over-the-air firmware update, "
    "relational tables required ALTER TABLE migrations. "
    "We recommend polyglot persistence: keep relational engines for transactional billing and CRM, but deploy MongoDB "
    "as the dedicated telemetry engine. Our prototype proves three key claims: seamless schema evolution, 105-fold query speedup, "
    "and zero lost acknowledged writes during primary hardware failure."
)

# ==============================================================================
# SLIDE 3: NoSQL Landscape & Theoretical Basis
# ==============================================================================
slide3 = prs.slides.add_slide(blank_layout)
set_slide_background(slide3, COLOR_LIGHT_BG)
add_header(slide3, "NoSQL Landscape & Theoretical Foundations", "Theoretical Analysis", 3)

families = [
    ("Key-Value Stores", "Redis, Amazon Dynamo", "Opaque byte arrays indexed by unique key.", "O(1) constant-time point lookup; simple hash partitioning.", "Cannot query nested fields; range scans require full keyspace scan.", "Good for caching state; poor for analytical time-series.", Inches(0.8), Inches(1.45)),
    ("Document Stores", "MongoDB, Couchbase", "Hierarchical BSON/JSON polymorphic documents.", "Flexible schema, rich secondary indexing, in-database aggregation.", "Many-to-many joins are awkward; 16 MB BSON document limit.", "OPTIMAL: Native JSON telemetry mapping & local analytics.", Inches(6.8), Inches(1.45)),
    ("Wide-Column Stores", "Apache Cassandra, Bigtable", "Multi-dimensional sorted maps (row, col family, time).", "Very high write throughput (LSM-trees); masterless ring.", "Query-first data model; secondary index & ad-hoc analytics limitations.", "High write scale, but excessive query rigidity for domestic tanks.", Inches(0.8), Inches(3.85)),
    ("Graph Stores", "Neo4j", "Nodes, directed edges, key-value properties.", "Index-free adjacency: O(1) multi-hop pointer traversals.", "Unsuitable for high-velocity append streams; pointer overhead.", "Ideal for utility pipe topology; unsuited for raw sensor streams.", Inches(6.8), Inches(3.85))
]

for title, examples, model, pro, con, verdict, left, top in families:
    card = add_card(slide3, left, top, Inches(5.75), Inches(2.25))
    tf = add_padded_textbox(slide3, left, top, Inches(5.75), Inches(2.25), pad_h=Inches(0.28), pad_v=Inches(0.2))
    
    p0 = tf.paragraphs[0]
    p0.text = title.upper()
    p0.font.name = FONT_HEADING
    p0.font.size = Pt(11.5)
    p0.font.bold = True
    p0.font.color.rgb = COLOR_TEXT_MAIN
    
    r_ex = p0.add_run()
    r_ex.text = f"  ({examples})"
    r_ex.font.size = Pt(9)
    r_ex.font.bold = False
    r_ex.font.color.rgb = COLOR_TEXT_MUTED
    
    lines = [
        ("Model: ", model),
        ("Strength: ", pro),
        ("Limitation: ", con),
        ("Verdict: ", verdict)
    ]
    for lbl, val in lines:
        p = tf.add_paragraph()
        p.space_before = Pt(1.5)
        r1 = p.add_run()
        r1.text = lbl
        r1.font.bold = True
        r1.font.size = Pt(8.8)
        r1.font.color.rgb = COLOR_ACCENT_TEAL if lbl == "Verdict: " else COLOR_TEXT_MAIN
        r2 = p.add_run()
        r2.text = val
        r2.font.size = Pt(8.8)
        r2.font.color.rgb = COLOR_ACCENT_BLUE if lbl == "Verdict: " else COLOR_TEXT_BODY

theory_card = add_card(slide3, Inches(0.8), Inches(6.25), Inches(11.75), Inches(0.85), bg_color=COLOR_WHITE)
tf_th = add_padded_textbox(slide3, Inches(0.8), Inches(6.25), Inches(11.75), Inches(0.85), pad_h=Inches(0.25), pad_v=Inches(0.15))
p_th = tf_th.paragraphs[0]
r_th1 = p_th.add_run()
r_th1.text = "Theoretical Foundations (CAP & PACELC): "
r_th1.font.bold = True
r_th1.font.size = Pt(9.5)
r_th1.font.color.rgb = COLOR_ACCENT_BLUE
r_th2 = p_th.add_run()
r_th2.text = "MongoDB WiredTiger uses B-Trees with MVCC, trading write-amplification for zero read-amplification. Under Brewer's CAP and Abadi's PACELC models, configuring majority write concern (w: 'majority') enforces CP characteristics: under network partition, isolated nodes reject writes to prevent split-brain divergence, guaranteeing strong consistency."
r_th2.font.size = Pt(8.8)
r_th2.font.color.rgb = COLOR_TEXT_BODY

set_speaker_notes(slide3,
    "Here we examine the four primary NoSQL families against IoThings requirements. "
    "Key-Value stores provide O(1) lookups but cannot query nested fields. "
    "Wide-Column stores like Cassandra provide high ingestion through LSM-trees, but ad-hoc analytics require complex external tools like Spark. "
    "Graph stores provide index-free adjacency for topologies, but flat append streams cause supernode contention. "
    "Document databases, specifically MongoDB, provide the sweet spot: native BSON mapping, flexible schemas, and rich in-database aggregation. "
    "Under CAP and PACELC, MongoDB with majority write concern operates as a consistent and partition-tolerant (CP) system."
)

# ==============================================================================
# SLIDE 4: Relational vs. Document Paradigm Comparison
# ==============================================================================
slide4 = prs.slides.add_slide(blank_layout)
set_slide_background(slide4, COLOR_LIGHT_BG)
add_header(slide4, "Critical Comparison: Relational vs. Document Paradigm", "Paradigm Evaluation", 4)

table_shape = slide4.shapes.add_table(6, 4, Inches(0.8), Inches(1.45), Inches(11.75), Inches(4.2))
table = table_shape.table

table.columns[0].width = Inches(2.1)
table.columns[1].width = Inches(3.1)
table.columns[2].width = Inches(3.2)
table.columns[3].width = Inches(3.35)

headers = ["Dimension", "Relational (PostgreSQL / MySQL)", "Document (MongoDB)", "IoThings Architectural Implication"]
data = [
    ["Schema Design", "Rigid DDL; ALTER TABLE locks required on schema changes.", "Flexible dynamic schema per document; optional $jsonSchema validation.", "Firmware payload updates (v2.4.1 -> v2.5.0) absorbed with zero downtime."],
    ["Data Layout", "Normalised across multiple tables; reassembled via foreign key JOINs.", "Hierarchical aggregate embedding; related data stored together.", "One sensor cycle (depth, floats, relays) stored in one atomic document write."],
    ["ACID Semantics", "Full multi-row, multi-table ACID transactions.", "Native single-document atomicity; multi-document ACID available.", "Billing retains multi-row ACID; telemetry needs only single-document atomicity."],
    ["Query Model", "Declarative SQL standard; relational algebra.", "BSON query expressions & native aggregation pipeline.", "Powerful in-database transformations without separate streaming ETL."],
    ["Scale-Out Path", "Vertical scaling; read replicas; sharding requires external middleware (Vitess).", "Built-in replication sets & automatic horizontal sharding.", "Clear scale-out path from 3-node replica set to distributed sharded cluster."]
]

for col_idx, text in enumerate(headers):
    cell = table.cell(0, col_idx)
    cell.fill.solid()
    cell.fill.fore_color.rgb = COLOR_NAVY_DARK
    p = cell.text_frame.paragraphs[0]
    p.text = text
    p.font.name = FONT_HEADING
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = COLOR_WHITE
    p.alignment = PP_ALIGN.LEFT

for row_idx, row_data in enumerate(data, start=1):
    bg_c = COLOR_WHITE if row_idx % 2 == 1 else COLOR_CARD_SHADOW
    for col_idx, text in enumerate(row_data):
        cell = table.cell(row_idx, col_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = bg_c
        p = cell.text_frame.paragraphs[0]
        p.text = text
        p.font.name = FONT_BODY
        p.font.size = Pt(9)
        p.font.color.rgb = COLOR_ACCENT_BLUE if col_idx == 0 else (COLOR_ACCENT_TEAL if col_idx == 3 else COLOR_TEXT_BODY)
        p.font.bold = (col_idx == 0 or col_idx == 3)

callout = add_card(slide4, Inches(0.8), Inches(5.8), Inches(11.75), Inches(1.15), bg_color=COLOR_PILL_BG, border_color=COLOR_PILL_TEXT)
tf_c = add_padded_textbox(slide4, Inches(0.8), Inches(5.8), Inches(11.75), Inches(1.15), pad_h=Inches(0.3), pad_v=Inches(0.18))
p_c = tf_c.paragraphs[0]
r_c1 = p_c.add_run()
r_c1.text = "Strategic Conclusion on Polyglot Persistence: "
r_c1.font.bold = True
r_c1.font.size = Pt(10.5)
r_c1.font.color.rgb = COLOR_PILL_TEXT
r_c2 = p_c.add_run()
r_c2.text = "NoSQL is not an all-or-nothing replacement for RDBMS. IoThings adopts a dual-tier polyglot architecture: relational engines maintain structured customer accounts, billing, and regulatory financial data, while MongoDB handles high-velocity sensor telemetry and real-time automation."
r_c2.font.size = Pt(9.5)
r_c2.font.color.rgb = COLOR_TEXT_BODY

set_speaker_notes(slide4,
    "This table compares relational and document paradigms generically. "
    "In relational systems, telemetry data must be normalized across tables, requiring joins that degrade read performance. "
    "In MongoDB, a complete reading—water depth, float switch positions, and valve states—is stored in a single document atomically. "
    "Crucially, our recommendation is not to discard relational databases, but to adopt polyglot persistence: "
    "keep PostgreSQL or MySQL for billing and inventory where multi-table transactions excel, and use MongoDB for telemetry."
)

# ==============================================================================
# SLIDE 5: End-to-End System Architecture
# ==============================================================================
slide5 = prs.slides.add_slide(blank_layout)
set_slide_background(slide5, COLOR_LIGHT_BG)
add_header(slide5, "End-to-End System Architecture & Pipeline", "System Design", 5)

c_arch = add_card(slide5, Inches(0.8), Inches(1.45), Inches(5.6), Inches(5.55))
tf_a = add_padded_textbox(slide5, Inches(0.8), Inches(1.45), Inches(5.6), Inches(5.55), pad_h=Inches(0.32), pad_v=Inches(0.28))

p_a = tf_a.paragraphs[0]
p_a.text = "Architecture & Data Pipeline Flow"
p_a.font.name = FONT_HEADING
p_a.font.size = Pt(15)
p_a.font.bold = True
p_a.font.color.rgb = COLOR_TEXT_MAIN

pipeline_steps = [
    ("1. Physics-Based Simulator", "Simulates ESP32 microcontroller with HC-SR04 ultrasonic sensor, float switches, and actuator relays for a 2,000L tank."),
    ("2. MQTT Broker (Mosquitto v2.1.2)", "Subscribes on port 1883 at QoS 1 (at-least-once delivery), decoupling edge hardware from database ingestion."),
    ("3. Node.js Ingestion Engine (v24.14.1)", "Validates schemas, routes malformed payloads to Dead-Letter Queue (DLQ), and executes dual-threshold hysteresis control rules."),
    ("4. MongoDB Distributed Cluster (rs0)", "Three-member replica set running v8.0.30 on ports 27017, 27018, 27019. Writes commit with w: 'majority'."),
    ("5. Express.js REST API & React 18 UI", "Express exposes OpenAPI 3.0 / Swagger docs; React dashboard polls every 2s with readPreference: 'secondaryPreferred'.")
]

for title, desc in pipeline_steps:
    p = tf_a.add_paragraph()
    p.space_before = Pt(5)
    r1 = p.add_run()
    r1.text = "• " + title + "\n"
    r1.font.bold = True
    r1.font.size = Pt(10)
    r1.font.color.rgb = COLOR_ACCENT_BLUE
    r2 = p.add_run()
    r2.text = "   " + desc
    r2.font.size = Pt(9)
    r2.font.color.rgb = COLOR_TEXT_BODY

add_image_card(slide5, "figures/01-system-architecture.png", Inches(6.6), Inches(1.45), Inches(5.95), Inches(5.55), 
               title="Pipeline Architecture: Write Path vs Read Path", 
               subtitle="Solid lines indicate Primary write path; dashed lines indicate Secondary read routing.")

set_speaker_notes(slide5,
    "This slide illustrates the full end-to-end architecture. "
    "At the edge, we simulate an ESP32 microcontroller publishing JSON telemetry over MQTT QoS 1 to Eclipse Mosquitto. "
    "A Node.js ingestion worker consumes the MQTT stream, validates payload structure against jsonSchema, "
    "evaluates automated control rules, and writes to MongoDB replica set rs0 with majority write concern. "
    "Notice the segregation of read and write paths: all mutations go to the Primary, while analytical dashboard reads "
    "are routed to Secondaries via secondaryPreferred, preventing analytical queries from degrading ingestion performance."
)

# ==============================================================================
# SLIDE 6: Database Schema & Real User Screenshots (CROPPED & ZOOMED)
# ==============================================================================
slide6 = prs.slides.add_slide(blank_layout)
set_slide_background(slide6, COLOR_LIGHT_BG)
add_header(slide6, "Database Schema & Hierarchical BSON Modeling", "Database Design", 6)

c_col = add_card(slide6, Inches(0.8), Inches(1.45), Inches(5.5), Inches(5.55))
tf_col = add_padded_textbox(slide6, Inches(0.8), Inches(1.45), Inches(5.5), Inches(5.55), pad_h=Inches(0.3), pad_v=Inches(0.25))

p_col = tf_col.paragraphs[0]
p_col.text = "Collections in Database 'smart_water'"
p_col.font.name = FONT_HEADING
p_col.font.size = Pt(14)
p_col.font.bold = True
p_col.font.color.rgb = COLOR_TEXT_MAIN

col_items = [
    ("homes (Property Registry): ", "Static master records storing home_id, address, occupant count."),
    ("devices (Hardware Registry): ", "IoT hardware metadata, firmware version, tank dimensions (200 cm, 2,000 L)."),
    ("sensor_activations (Telemetry Event Store): ", "Append-only time-series store. Encapsulates ultrasonic depth %, volume in litres, float switches, and actuator states in a single BSON document."),
    ("alerts (Operational Alarms): ", "Threshold, dry-run, overflow, and leak alerts with acknowledgement status and timestamps."),
    ("rejected_messages (Dead-Letter Queue): ", "Malformed or unparseable MQTT payloads with validation error logs."),
    ("Lifecycle Management (UK GDPR): ", "30-day TTL index on sensor_activations and 7-day TTL index on rejected_messages automatically purge stale data.")
]

for title, desc in col_items:
    p = tf_col.add_paragraph()
    p.space_before = Pt(4)
    r1 = p.add_run()
    r1.text = "• " + title
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = COLOR_ACCENT_TEAL
    r2 = p.add_run()
    r2.text = desc
    r2.font.size = Pt(8.8)
    r2.font.color.rgb = COLOR_TEXT_BODY

# Right Column: USER'S AUTHENTIC SCREENSHOTS (Cropped tightly to show large readable text!)
add_image_card(slide6, "figures/cropped/04-schema-evolution.png", Inches(6.5), Inches(1.45), Inches(6.0), Inches(2.7),
               title="Terminal Screenshot: Real Schema Evolution (Cropped & Zoomed)",
               subtitle="Authentic mongosh terminal showing v2.4.1 and v2.5.0 coexisting without migrations.")

add_image_card(slide6, "figures/cropped/A1-collections-document.png", Inches(6.5), Inches(4.3), Inches(6.0), Inches(2.7),
               title="MongoDB Compass: Real BSON Document Explorer",
               subtitle="Live Compass view displaying nested telemetry, floats, and actuator states.")

set_speaker_notes(slide6,
    "Here we examine the database structure. The smart_water database consists of five primary collections. "
    "Reference data like homes and devices is kept small and static, while sensor_activations is our high-velocity append-only store. "
    "On the right, we show real evidence: the top terminal screenshot demonstrates schema evolution where v2.4.1 and v2.5.0 "
    "coexist seamlessly without DDL migrations or sparse columns. "
    "The bottom screenshot shows MongoDB Compass displaying real nested BSON documents containing ultrasonic depth, volume, and actuator states. "
    "Furthermore, we implement 30-day and 7-day TTL indexes to satisfy UK GDPR storage limitation principles."
)

# ==============================================================================
# SLIDE 7: Query Performance & Empirical Index Benchmarks
# ==============================================================================
slide7 = prs.slides.add_slide(blank_layout)
set_slide_background(slide7, COLOR_LIGHT_BG)
add_header(slide7, "Query Optimization & Empirical Index Benchmarks", "Performance Benchmarking", 7)

c_tbl = add_card(slide7, Inches(0.8), Inches(1.45), Inches(5.6), Inches(2.45))
tf_tb_hdr = add_padded_textbox(slide7, Inches(0.8), Inches(1.45), Inches(5.6), Inches(0.4), pad_h=Inches(0.2), pad_v=Inches(0.08))
p_t = tf_tb_hdr.paragraphs[0]
p_t.text = "Empirical Query Plan Benchmark on 30,985 Records"
p_t.font.name = FONT_HEADING
p_t.font.size = Pt(12)
p_t.font.bold = True
p_t.font.color.rgb = COLOR_TEXT_MAIN

t_b = slide7.shapes.add_table(3, 5, Inches(1.0), Inches(1.9), Inches(5.2), Inches(1.8)).table
t_b.columns[0].width = Inches(1.6)
t_b.columns[1].width = Inches(0.8)
t_b.columns[2].width = Inches(0.9)
t_b.columns[3].width = Inches(1.1)
t_b.columns[4].width = Inches(0.8)

b_headers = ["Access Path", "Keys", "Docs", "Stages", "Latency"]
b_rows = [
    ["Forced CollScan", "0", "30,985", "SORT -> COLLSCAN", "105 ms"],
    ["Compound (ESR)", "50", "50", "LIMIT -> IXSCAN", "1 ms"]
]
for idx, h in enumerate(b_headers):
    cell = t_b.cell(0, idx)
    cell.fill.solid()
    cell.fill.fore_color.rgb = COLOR_NAVY_DARK
    p = cell.text_frame.paragraphs[0]
    p.text = h
    p.font.size = Pt(9)
    p.font.bold = True
    p.font.color.rgb = COLOR_WHITE

for r_idx, row in enumerate(b_rows, start=1):
    bg_c = COLOR_WHITE if r_idx == 1 else RGBColor(240, 253, 244)
    for c_idx, val in enumerate(row):
        cell = t_b.cell(r_idx, c_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = bg_c
        p = cell.text_frame.paragraphs[0]
        p.text = val
        p.font.size = Pt(9)
        p.font.bold = (r_idx == 2)
        p.font.color.rgb = COLOR_ACCENT_GREEN if (r_idx == 2 and c_idx == 4) else COLOR_TEXT_MAIN

c_esr = add_card(slide7, Inches(0.8), Inches(4.05), Inches(5.6), Inches(2.95))
tf_esr = add_padded_textbox(slide7, Inches(0.8), Inches(4.05), Inches(5.6), Inches(2.95), pad_h=Inches(0.3), pad_v=Inches(0.2))

p_e1 = tf_esr.paragraphs[0]
p_e1.text = "Index Design Principles & ESR Guideline"
p_e1.font.name = FONT_HEADING
p_e1.font.size = Pt(13)
p_e1.font.bold = True
p_e1.font.color.rgb = COLOR_TEXT_MAIN

esr_bullets = [
    ("Equality-Sort-Range (ESR): ", "Compound index { device_id: 1, timestamp: -1 } places equality filter first and sort order second, avoiding in-memory sort entirely."),
    ("105x Latency Improvement: ", "Scanning 30,985 documents took 105 ms. The compound index examined exactly 50 keys and 50 documents, returning results in 1 ms."),
    ("Index Governance in Compass: ", "Monitored index usage counts; identified unused indexes (alert_time, type_time) for deprecation before production.")
]
for title, desc in esr_bullets:
    p = tf_esr.add_paragraph()
    p.space_before = Pt(4)
    r1 = p.add_run()
    r1.text = "• " + title
    r1.font.bold = True
    r1.font.size = Pt(9)
    r1.font.color.rgb = COLOR_ACCENT_BLUE
    r2 = p.add_run()
    r2.text = desc
    r2.font.size = Pt(9)
    r2.font.color.rgb = COLOR_TEXT_BODY

add_image_card(slide7, "figures/cropped/04-compass-indexes.png", Inches(6.6), Inches(1.45), Inches(5.95), Inches(5.55),
               title="MongoDB Compass: Real Index Inspection & Audit",
               subtitle="Compound index (device_id, timestamp) and unique index with measured usage counts.")

set_speaker_notes(slide7,
    "This slide demonstrates the dramatic impact of proper index design. "
    "In IoT telemetry, the dominant query is: 'give me the latest 50 readings for tank X'. "
    "Without an index, MongoDB executes a full collection scan (COLLSCAN) across all 30,985 records and performs an in-memory sort, taking 105 milliseconds. "
    "By applying MongoDB's Equality-Sort-Range rule with a compound index on device_id and timestamp descending, "
    "the engine inspects exactly 50 keys and returns in 1 millisecond—a 105-fold speedup. "
    "On the right is real visual evidence from MongoDB Compass confirming the active indexes and their usage counts."
)

# ==============================================================================
# SLIDE 8: High Availability & Replica Set Design
# ==============================================================================
slide8 = prs.slides.add_slide(blank_layout)
set_slide_background(slide8, COLOR_LIGHT_BG)
add_header(slide8, "High Availability: 3-Member Replica Set Architecture", "Distributed Management", 8)

c_ha = add_card(slide8, Inches(0.8), Inches(1.45), Inches(5.5), Inches(5.55))
tf_ha = add_padded_textbox(slide8, Inches(0.8), Inches(1.45), Inches(5.5), Inches(5.55), pad_h=Inches(0.3), pad_v=Inches(0.25))

p_ha = tf_ha.paragraphs[0]
p_ha.text = "Replica Set 'rs0' Architecture & Quorum"
p_ha.font.name = FONT_HEADING
p_ha.font.size = Pt(14)
p_ha.font.bold = True
p_ha.font.color.rgb = COLOR_TEXT_MAIN

ha_bullets = [
    ("Topology: ", "3 voting nodes deployed across distinct ports (27017 Primary, 27018 Secondary, 27019 Secondary) with isolated data paths."),
    ("Strict Quorum Arithmetic: ", "Majority required = floor(N/2) + 1 = floor(3/2) + 1 = 2 voting nodes. Writes require 2 confirmations before client acknowledgement."),
    ("Replication Synchronization: ", "Secondaries continuously stream and apply operations from the Primary's oplog (operation log). Measured replication lag: 0.0 seconds."),
    ("Heartbeats & Raft Elections: ", "Nodes exchange heartbeats every 2 seconds. If Primary heartbeats fail for electionTimeoutMillis (10s), secondaries initiate an election."),
    ("Read Routing (secondaryPreferred): ", "Dashboard analytical queries route to secondaries, insulating the primary from heavy reporting reads.")
]

for title, desc in ha_bullets:
    p = tf_ha.add_paragraph()
    p.space_before = Pt(4)
    r1 = p.add_run()
    r1.text = "• " + title
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = COLOR_ACCENT_TEAL
    r2 = p.add_run()
    r2.text = desc
    r2.font.size = Pt(8.8)
    r2.font.color.rgb = COLOR_TEXT_BODY

add_image_card(slide8, "figures/cropped/B1-rs-status.png", Inches(6.5), Inches(1.45), Inches(6.0), Inches(2.7),
               title="Terminal Evidence: Real rs.status() Output",
               subtitle="Node 27017 elected PRIMARY; nodes 27018 and 27019 healthy SECONDARY.")

add_image_card(slide8, "figures/cropped/B2-replication-counts.png", Inches(6.5), Inches(4.3), Inches(6.0), Inches(2.7),
               title="Real Replication Parity & 0s Lag",
               subtitle="Authentic terminal showing document counts matched across all 3 members.")

set_speaker_notes(slide8,
    "To deliver high availability, we deployed a 3-member MongoDB replica set named rs0. "
    "A 3-node set requires a strict quorum of 2 votes. "
    "Writes are submitted with majority write concern, ensuring data is written to at least two nodes before being acknowledged. "
    "On the right are two real terminal screenshots: the top confirms rs.status() with one healthy Primary and two healthy Secondaries. "
    "The bottom screenshot proves document count parity across all three nodes and a measured replication lag of 0.0 seconds."
)

# ==============================================================================
# SLIDE 9: Empirical Failover & Quorum Loss Testing (AUTHENTIC CROPPED USER IMAGES)
# ==============================================================================
slide9 = prs.slides.add_slide(blank_layout)
set_slide_background(slide9, COLOR_LIGHT_BG)
add_header(slide9, "Empirical Failover & Quorum Resilience", "Resilience Testing", 9)

c_f1 = add_card(slide9, Inches(0.8), Inches(1.45), Inches(5.5), Inches(2.65))
tf_f1 = add_padded_textbox(slide9, Inches(0.8), Inches(1.45), Inches(5.5), Inches(2.65), pad_h=Inches(0.25), pad_v=Inches(0.18))

p = tf_f1.paragraphs[0]
p.text = "Test 1: Graceful Step-Down (rs.stepDown())"
p.font.name = FONT_HEADING
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = COLOR_ACCENT_BLUE

f1_details = [
    ("Mechanism: ", "Primary relinquishes leadership cooperatively."),
    ("Longest Write Pause: ", "0.62 seconds (619 ms)."),
    ("Write Acknowledgement: ", "19 of 19 probe writes acknowledged (100%)."),
    ("Post-Recovery Parity: ", "19 of 19 writes verified present in database."),
    ("Durability Verdict: ", "ZERO lost writes across election transition.")
]
for lbl, val in f1_details:
    p = tf_f1.add_paragraph()
    p.space_before = Pt(2)
    r1 = p.add_run()
    r1.text = "• " + lbl
    r1.font.bold = True
    r1.font.size = Pt(9)
    r2 = p.add_run()
    r2.text = val
    r2.font.size = Pt(9)

c_f2 = add_card(slide9, Inches(0.8), Inches(4.25), Inches(5.5), Inches(2.75))
tf_f2 = add_padded_textbox(slide9, Inches(0.8), Inches(4.25), Inches(5.5), Inches(2.75), pad_h=Inches(0.25), pad_v=Inches(0.18))

p = tf_f2.paragraphs[0]
p.text = "Test 2: Quorum Loss & Crash Resilience (kill -9)"
p.font.name = FONT_HEADING
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = COLOR_ACCENT_AMBER

f2_details = [
    ("Quorum Loss Test: ", "Stopping 2 nodes returned error 64 (WriteConcernTimeout)."),
    ("Abrupt Primary Kill: ", "Primary process terminated with SIGKILL (kill -9)."),
    ("Election Detection: ", "Secondaries waited 10s electionTimeout threshold."),
    ("Longest Write Pause: ", "11.48 seconds (11,483 ms)."),
    ("Durability Guarantee: ", "All 67 acknowledged writes present after recovery (0 lost writes).")
]
for lbl, val in f2_details:
    p = tf_f2.add_paragraph()
    p.space_before = Pt(2)
    r1 = p.add_run()
    r1.text = "• " + lbl
    r1.font.bold = True
    r1.font.size = Pt(9)
    r2 = p.add_run()
    r2.text = val
    r2.font.size = Pt(9)

# Right Column: USER'S AUTHENTIC SCREENSHOTS (CROPPED & ZOOMED)
add_image_card(slide9, "figures/cropped/E2-cluster-page.png", Inches(6.5), Inches(1.45), Inches(6.0), Inches(2.7),
               title="React Dashboard: Real Cluster Failover Diagnostics (E2)",
               subtitle="Live topology view showing PRIMARY/SECONDARY member health and failover monitoring.")

add_image_card(slide9, "figures/cropped/E3-quorum.png", Inches(6.5), Inches(4.3), Inches(6.0), Inches(2.7),
               title="Terminal Screenshot: Real Quorum Loss Test (E3)",
               subtitle="Authentic terminal showing Error 64 (WriteConcernTimeout) when quorum is lost.")

set_speaker_notes(slide9,
    "We rigorously benchmarked cluster failover using scripts/measure-failover.js, "
    "which submits probe writes every 500 ms with majority write concern while inducing failures. "
    "Under a graceful step-down, write interruption lasted only 0.62 seconds with 100% of writes acknowledged. "
    "On the top right is our real React cluster diagnostics page showing active nodes, election status, and cluster topology. "
    "On the bottom right, you see Shekhar's authentic quorum loss test: when 2 of 3 nodes were stopped, the cluster returned error 64, "
    "proving CP consistency: the cluster pauses writes rather than risking split-brain data corruption."
)

# ==============================================================================
# SLIDE 10: Ingestion Integrity, Idempotency & Disaster Recovery
# ==============================================================================
slide10 = prs.slides.add_slide(blank_layout)
set_slide_background(slide10, COLOR_LIGHT_BG)
add_header(slide10, "Data Integrity, Idempotency & Disaster Recovery", "Fault Tolerance", 10)

c_idem = add_card(slide10, Inches(0.8), Inches(1.45), Inches(5.5), Inches(5.55))
tf_id = add_padded_textbox(slide10, Inches(0.8), Inches(1.45), Inches(5.5), Inches(5.55), pad_h=Inches(0.3), pad_v=Inches(0.25))

p = tf_id.paragraphs[0]
p.text = "Idempotency & Closed-Loop Control"
p.font.name = FONT_HEADING
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = COLOR_TEXT_MAIN

idem_bullets = [
    ("MQTT QoS 1 Idempotency: ", "MQTT delivers 'at-least-once', risking duplicate messages upon reconnect. A unique compound index on (device_id, timestamp) traps duplicate inserts (Mongo Error 11000) and discards them safely, achieving effectively-once storage."),
    ("Dual-Threshold Hysteresis: ", "Prevents rapid relay chattering and actuator wear:"),
    ("  • Inlet Valve: ", "Opens at <40% (low level), closes at >85% (overflow prevention)."),
    ("  • Booster Pump: ", "Stops at <=25% (dry-run cavitation protection), resumes only at >35%."),
    ("Dead-Letter Queue (DLQ): ", "Malformed payloads fail $jsonSchema validation and are routed to rejected_messages with error diagnostics instead of silent drops.")
]
for title, desc in idem_bullets:
    p = tf_id.add_paragraph()
    p.space_before = Pt(4)
    r1 = p.add_run()
    r1.text = "• " + title
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = COLOR_ACCENT_TEAL
    r2 = p.add_run()
    r2.text = desc
    r2.font.size = Pt(8.8)
    r2.font.color.rgb = COLOR_TEXT_BODY

# Right Column: USER'S AUTHENTIC SCREENSHOTS (CROPPED & ZOOMED)
add_image_card(slide10, "figures/cropped/C1-api-success.png", Inches(6.5), Inches(1.45), Inches(6.0), Inches(2.7),
               title="Terminal Screenshot: Real Telemetry API Verification (C1)",
               subtitle="Paginated telemetry history query returning HTTP 200 with stored document integrity.")

add_image_card(slide10, "figures/cropped/E4-backup-restore.png", Inches(6.5), Inches(4.3), Inches(6.0), Inches(2.7),
               title="Terminal Screenshot: Real Backup & Restore Parity (E4)",
               subtitle="mongodump in 1.08s; mongorestore in 5.48s with 100% document count parity.")

set_speaker_notes(slide10,
    "Replication protects against hardware failure, but it replicates user errors like accidental drops. "
    "We verified disaster recovery using mongodump and mongorestore: creating a compressed snapshot in 1.08s and restoring in 5.48s "
    "with 100% parity across all 29,756 records, as shown in the authentic terminal capture on the bottom right. "
    "On ingestion, we handle MQTT QoS 1 retries with a unique compound index on device_id and timestamp, converting at-least-once into effectively-once storage. "
    "We also implemented dual-threshold hysteresis for valves and pumps to eliminate relay chattering."
)

# ==============================================================================
# SLIDE 11: RESTful API & Security Architecture
# ==============================================================================
slide11 = prs.slides.add_slide(blank_layout)
set_slide_background(slide11, COLOR_LIGHT_BG)
add_header(slide11, "RESTful API Implementation & Security Model", "Integration & Security", 11)

c_api = add_card(slide11, Inches(0.8), Inches(1.45), Inches(5.5), Inches(5.55))
tf_api = add_padded_textbox(slide11, Inches(0.8), Inches(1.45), Inches(5.5), Inches(5.55), pad_h=Inches(0.3), pad_v=Inches(0.25))

p = tf_api.paragraphs[0]
p.text = "REST API Architecture & Authentication"
p.font.name = FONT_HEADING
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = COLOR_TEXT_MAIN

api_bullets = [
    ("OpenAPI 3.0 / Swagger UI: ", "Interactive documentation hosted at /api-docs exposing all CRUD routes."),
    ("Full CRUD Operations: ", "Create, Read, Update, Delete verified across homes, devices, telemetry, and alert acknowledgements."),
    ("Security & Authorization: ", "Mutating endpoints (POST, PATCH, DELETE) require an X-API-Key header. Requests lacking valid keys are rejected immediately with HTTP 401 Unauthorized."),
    ("Read/Write Preference Split: ", "API routes writes to Primary (majority concern); historical/analytical reads use secondaryPreferred to prevent reporting spikes from impacting ingestion."),
    ("Paginated Queries: ", "Telemetry history endpoints utilize cursor pagination to avoid memory bloat and enforce low latencies.")
]
for title, desc in api_bullets:
    p = tf_api.add_paragraph()
    p.space_before = Pt(5)
    r1 = p.add_run()
    r1.text = "• " + title
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = COLOR_ACCENT_BLUE
    r2 = p.add_run()
    r2.text = desc
    r2.font.size = Pt(8.8)
    r2.font.color.rgb = COLOR_TEXT_BODY

# Right Column: USER'S AUTHENTIC SCREENSHOTS (CROPPED & ZOOMED)
add_image_card(slide11, "figures/cropped/05-swagger.png", Inches(6.5), Inches(1.45), Inches(6.0), Inches(2.9),
               title="Swagger UI: Real Interactive API Contract (/api-docs)",
               subtitle="OpenAPI 3.0 schema documentation and interactive test harness.")

add_image_card(slide11, "figures/cropped/E5-security-state.png", Inches(6.5), Inches(4.5), Inches(6.0), Inches(2.5),
               title="Terminal Screenshot: Real 401 Unauthorized Test (E5)",
               subtitle="Enforcement of X-API-Key header: unauthenticated requests blocked with HTTP 401.")

set_speaker_notes(slide11,
    "The presentation and integration tier is powered by an Express.js REST API documented with Swagger UI. "
    "We implemented full CRUD endpoints for property registry, devices, telemetry histories, and alert lifecycle. "
    "Security is enforced at the middleware layer using an X-API-Key header, returning HTTP 401 Unauthorized when unauthenticated, "
    "as demonstrated in the real terminal test on the bottom right. "
    "Furthermore, read queries enforce secondaryPreferred read routing, ensuring dashboard refreshes don't steal IOPS from the primary."
)

# ==============================================================================
# SLIDE 12: Water Intelligence & Real-Time Dashboard
# ==============================================================================
slide12 = prs.slides.add_slide(blank_layout)
set_slide_background(slide12, COLOR_LIGHT_BG)
add_header(slide12, "Water Intelligence & Real-Time React Dashboard", "Analytics & Frontend", 12)

c_int = add_card(slide12, Inches(0.8), Inches(1.45), Inches(5.5), Inches(5.55))
tf_int = add_padded_textbox(slide12, Inches(0.8), Inches(1.45), Inches(5.5), Inches(5.55), pad_h=Inches(0.3), pad_v=Inches(0.25))

p = tf_int.paragraphs[0]
p.text = "In-Database Water Intelligence Features"
p.font.name = FONT_HEADING
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = COLOR_TEXT_MAIN

intel_bullets = [
    ("In-Database Aggregations: ", "Uses $match, $dateTrunc, and $setWindowFields directly in MongoDB to calculate daily volume consumption deltas without transferring tens of thousands of raw documents to application memory."),
    ("Overnight Slow Leak Detection: ", "Heuristic monitors quiet hours (01:00–05:00 UTC). If volume drops >=1.5% (30L) across 3 consecutive readings while pump and inlet are idle, a high-severity leak alert is triggered with a 4-hour cooldown."),
    ("Dynamic Depletion Forecasting: ", "Computes trailing drain rate to project estimated hours remaining until the critical 25% dry-run cutoff."),
    ("React 18 Operator Interface: ", "Real-time Vite dashboard polling every 2s, displaying live tank levels, gauge animations, consumption graphs, and cluster topology.")
]
for title, desc in intel_bullets:
    p = tf_int.add_paragraph()
    p.space_before = Pt(5)
    r1 = p.add_run()
    r1.text = "• " + title
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = COLOR_ACCENT_TEAL
    r2 = p.add_run()
    r2.text = desc
    r2.font.size = Pt(8.8)
    r2.font.color.rgb = COLOR_TEXT_BODY

# Right Column: USER'S AUTHENTIC SCREENSHOTS (CROPPED & ZOOMED)
add_image_card(slide12, "figures/cropped/06-dashboard.png", Inches(6.5), Inches(1.45), Inches(6.0), Inches(2.7),
               title="Live React Dashboard: Real Water Intelligence",
               subtitle="Live tank level, volume analytics, overnight-loss banner, and consumption trends.")

add_image_card(slide12, "figures/cropped/E2-cluster-page.png", Inches(6.5), Inches(4.3), Inches(6.0), Inches(2.7),
               title="React Dashboard: Real Cluster Diagnostics (E2)",
               subtitle="Visual node topologies, primary/secondary states, and cluster health monitoring.")

set_speaker_notes(slide12,
    "Beyond simple persistence, we turn raw telemetry into household intelligence. "
    "We leverage MongoDB's aggregation pipeline—using $dateTrunc and $setWindowFields—to compute daily water usage in-place inside the database. "
    "We also implemented overnight leak detection: between 01:00 and 05:00 UTC, if volume drops while actuators are idle, a leak alert is raised. "
    "On the right, you see real screenshots of our React 18 dashboard and cluster diagnostics page."
)

# ==============================================================================
# SLIDE 13: Critical Evaluation & Prototype Limitations
# ==============================================================================
slide13 = prs.slides.add_slide(blank_layout)
set_slide_background(slide13, COLOR_LIGHT_BG)
add_header(slide13, "Critical Evaluation & Operational Limitations", "Critical Evaluation", 13)

eval_cards = [
    ("Single-Host Environment", "All 3 mongod daemons ran on a single development machine (ports 27017-27019). While this validates election mechanics and process failure, it does not simulate physical network latency, rack failures, or cloud availability zone splits.", Inches(0.8), Inches(1.45)),
    ("Synthetic Telemetry Bias", "All sensor readings were generated by physics simulation models. Ultrasonic readings did not exhibit real-world environmental sensor noise, transducer echoes, or unpredictable household usage spikes.", Inches(6.8), Inches(1.45)),
    ("Transport & Cluster Security", "Development prototype operated without TLS encryption, MQTT broker accepted anonymous connections, and MongoDB ran without SCRAM-SHA-256 role-based access control (RBAC).", Inches(0.8), Inches(3.85)),
    ("Backup & Secondary Staleness", "Backups relied on periodic logical dumps (mongodump) rather than continuous oplog streaming (precluding point-in-time recovery). Dashboard reads on secondaries risk slight replication staleness.", Inches(6.8), Inches(3.85))
]

for title, desc, left, top in eval_cards:
    card = add_card(slide13, left, top, Inches(5.75), Inches(2.25))
    tf = add_padded_textbox(slide13, left, top, Inches(5.75), Inches(2.25), pad_h=Inches(0.3), pad_v=Inches(0.2))
    
    p0 = tf.paragraphs[0]
    p0.text = title
    p0.font.name = FONT_HEADING
    p0.font.size = Pt(12)
    p0.font.bold = True
    p0.font.color.rgb = COLOR_ACCENT_AMBER
    
    p1 = tf.add_paragraph()
    p1.space_before = Pt(4)
    p1.text = desc
    p1.font.name = FONT_BODY
    p1.font.size = Pt(9)
    p1.font.color.rgb = COLOR_TEXT_BODY

ban = add_card(slide13, Inches(0.8), Inches(6.25), Inches(11.75), Inches(0.85), bg_color=COLOR_WHITE)
tf_b = add_padded_textbox(slide13, Inches(0.8), Inches(6.25), Inches(11.75), Inches(0.85), pad_h=Inches(0.25), pad_v=Inches(0.15))
p_b = tf_b.paragraphs[0]
r_b1 = p_b.add_run()
r_b1.text = "Academic & Engineering Integrity: "
r_b1.font.bold = True
r_b1.font.size = Pt(9.5)
r_b1.font.color.rgb = COLOR_TEXT_MAIN
r_b2 = p_b.add_run()
r_b2.text = "These limitations highlight that the prototype is a rigorously validated architectural design, not an immediate production deployment. The next slide presents our structured, gated roadmap to bridge these operational gaps."
r_b2.font.size = Pt(8.8)
r_b2.font.color.rgb = COLOR_TEXT_MUTED

set_speaker_notes(slide13,
    "In any engineering project, honest appraisal of limitations is vital. "
    "Our prototype ran all three nodes on a single host. While election logic worked as designed, it cannot capture cross-datacenter WAN latency. "
    "Second, the telemetry is synthetic—it lacks the physical noise of real ultrasonic sensors. "
    "Third, security hardening—such as TLS encryption and SCRAM-SHA-256 authentication—was omitted in this local prototype. "
    "Recognizing these constraints leads directly into our four-phase production roadmap."
)

# ==============================================================================
# SLIDE 14: Phased Enhancement Roadmap
# ==============================================================================
slide14 = prs.slides.add_slide(blank_layout)
set_slide_background(slide14, COLOR_LIGHT_BG)
add_header(slide14, "Phased Executive Roadmap: Production Transition", "Strategic Roadmap", 14)

phases = [
    ("Phase 1: Correctness", "2–3 Weeks", "Transactional Outbox pattern coupling Mongo writes with MQTT actuator commands; alert deduplication; write retry buffer during elections.", "Zero duplicate or orphaned actuator commands in integration test suite.", COLOR_ACCENT_BLUE),
    ("Phase 2: Hardening", "3–4 Weeks", "Separate replica members across cloud Availability Zones; enforce TLS 1.3, SCRAM-SHA-256 RBAC, encrypted MQTT; continuous oplog backups.", "Multi-host failover verified under TLS with zero write loss; successful point-in-time recovery.", COLOR_ACCENT_TEAL),
    ("Phase 3: Pilot Validation", "6–8 Weeks", "Replace synthetic simulator with physical ESP32 microcontrollers in 50 pilot homes; calibrate ultrasonic noise and leak thresholds.", "Leak false-positive rate and depletion forecast error within agreed business SLAs.", COLOR_ACCENT_AMBER),
    ("Phase 4: Scale-Out", "4–6 Weeks", "Deploy horizontal sharding with compound shard key { household_id: 'hashed', timestamp: 1 } or MongoDB Time Series collections.", "Load testing confirms sustained ingestion exceeding single-primary capacity.", COLOR_ACCENT_GREEN)
]

for idx, (p_title, effort, scope, gate, color) in enumerate(phases):
    top = Inches(1.45 + idx * 1.35)
    card = add_card(slide14, Inches(0.8), top, Inches(11.75), Inches(1.22), bg_color=COLOR_WHITE)
    
    pill = add_card(slide14, Inches(1.0), top + Inches(0.16), Inches(2.2), Inches(0.9), bg_color=color, border_color=None)
    tb_p = slide14.shapes.add_textbox(Inches(1.0), top + Inches(0.2), Inches(2.2), Inches(0.8))
    tf_p = tb_p.text_frame
    tf_p.word_wrap = True
    p0 = tf_p.paragraphs[0]
    p0.text = p_title
    p0.font.name = FONT_HEADING
    p0.font.size = Pt(10.5)
    p0.font.bold = True
    p0.font.color.rgb = COLOR_WHITE
    p0.alignment = PP_ALIGN.CENTER
    
    p1 = tf_p.add_paragraph()
    p1.text = f"Effort: {effort}"
    p1.font.size = Pt(9)
    p1.font.color.rgb = RGBColor(241, 245, 249)
    p1.alignment = PP_ALIGN.CENTER
    p1.space_before = Pt(2)
    
    tb_c = slide14.shapes.add_textbox(Inches(3.4), top + Inches(0.12), Inches(8.9), Inches(0.98))
    tf_c = tb_c.text_frame
    tf_c.word_wrap = True
    
    p_sc = tf_c.paragraphs[0]
    r1 = p_sc.add_run()
    r1.text = "Scope: "
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = COLOR_TEXT_MAIN
    r2 = p_sc.add_run()
    r2.text = scope
    r2.font.size = Pt(9)
    r2.font.color.rgb = COLOR_TEXT_BODY
    
    p_gt = tf_c.add_paragraph()
    p_gt.space_before = Pt(3)
    r3 = p_gt.add_run()
    r3.text = "Measurable Gate Criterion: "
    r3.font.bold = True
    r3.font.size = Pt(9.5)
    r3.font.color.rgb = color
    r4 = p_gt.add_run()
    r4.text = gate
    r4.font.size = Pt(9)
    r4.font.color.rgb = COLOR_TEXT_BODY

set_speaker_notes(slide14,
    "To transition this validated prototype into production, we propose a 4-phase gated roadmap. "
    "Phase 1 focuses on correctness, implementing a Transactional Outbox pattern so actuator commands and Mongo writes commit atomically. "
    "Phase 2 hardens the system with TLS, SCRAM authentication, and multi-availability-zone deployment. "
    "Phase 3 validates the platform with 50 physical homes, tuning our leak detection algorithms. "
    "Phase 4 introduces horizontal sharding on household_id and timestamp once fleet size exceeds single-primary throughput. "
    "Each phase concludes with an explicit, measurable gate before management releases further investment."
)

# ==============================================================================
# SLIDE 15: Conclusion & Key Takeaways (Dark Theme)
# ==============================================================================
slide15 = prs.slides.add_slide(blank_layout)
set_slide_background(slide15, COLOR_NAVY_DARK)

tb_c_hdr = slide15.shapes.add_textbox(Inches(1.0), Inches(0.75), Inches(11.333), Inches(0.8))
tf_ch = tb_c_hdr.text_frame
p_ch = tf_ch.paragraphs[0]
p_ch.text = "Conclusion & Executive Recommendation"
p_ch.font.name = FONT_HEADING
p_ch.font.size = Pt(26)
p_ch.font.bold = True
p_ch.font.color.rgb = COLOR_WHITE

p_chs = tf_ch.add_paragraph()
p_chs.text = "IoThings Home Automation Solutions — CMP6207 Final Verdict"
p_chs.font.size = Pt(13)
p_chs.font.color.rgb = RGBColor(148, 163, 184)
p_chs.space_before = Pt(3)

concl_cards = [
    ("Technical Validation", "MongoDB is definitively validated for smart tank telemetry. Schema agility absorbs firmware updates without DDL locks, and compound indexing cuts query latency by 105x.", COLOR_ACCENT_BLUE),
    ("Polyglot Strategy", "Do not replace existing relational systems. Maintain RDBMS for ACID-governed billing and inventory, while deploying MongoDB beside them for telemetry and real-time automation.", COLOR_ACCENT_TEAL),
    ("Operational Reliability", "A 3-member replica set provides automatic failover with zero lost acknowledged writes. A bounded ~11s pause during abrupt crash preserves complete consistency without split-brain.", COLOR_ACCENT_GREEN)
]

for idx, (title, desc, color) in enumerate(concl_cards):
    left = Inches(1.0 + idx * 3.9)
    card = add_card(slide15, left, Inches(1.95), Inches(3.6), Inches(3.4), bg_color=COLOR_NAVY_SURFACE, border_color=color)
    tf = add_padded_textbox(slide15, left, Inches(1.95), Inches(3.6), Inches(3.4), pad_h=Inches(0.3), pad_v=Inches(0.25))
    
    p0 = tf.paragraphs[0]
    p0.text = title
    p0.font.name = FONT_HEADING
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = color
    
    p1 = tf.add_paragraph()
    p1.space_before = Pt(6)
    p1.text = desc
    p1.font.name = FONT_BODY
    p1.font.size = Pt(10)
    p1.font.color.rgb = RGBColor(226, 232, 240)

tb_end = slide15.shapes.add_textbox(Inches(1.0), Inches(5.65), Inches(11.333), Inches(1.2))
tf_end = tb_end.text_frame
p_end = tf_end.paragraphs[0]
p_end.text = "Thank You! Questions & Discussion Welcomed."
p_end.font.name = FONT_HEADING
p_end.font.size = Pt(19)
p_end.font.bold = True
p_end.font.color.rgb = COLOR_WHITE
p_end.alignment = PP_ALIGN.CENTER

p_end_sub = tf_end.add_paragraph()
p_end_sub.text = "Shekhar Lamichhane Magar  •  Student ID: 23189647  •  CMP6207 Modern Data Stores"
p_end_sub.font.size = Pt(11.5)
p_end_sub.font.color.rgb = RGBColor(148, 163, 184)
p_end_sub.alignment = PP_ALIGN.CENTER
p_end_sub.space_before = Pt(4)

set_speaker_notes(slide15,
    "To conclude, adopting MongoDB for the telemetry tier of IoThings is technically sound and operationally beneficial. "
    "It delivers schema agility, 105x index acceleration, and verified failover with zero lost acknowledged writes. "
    "Our executive recommendation is to retain relational databases for billing and inventory, while deploying MongoDB "
    "as the telemetry backbone under our phased roadmap. "
    "Thank you very much for your time. I am now happy to answer any questions."
)

# ==============================================================================
# SAVE PRESENTATION
# ==============================================================================
output_filename = "Shekhar_Lamichhane_Magar_23189647.pptx"
prs.save(output_filename)
print(f"Presentation successfully updated and saved as: {output_filename}")
