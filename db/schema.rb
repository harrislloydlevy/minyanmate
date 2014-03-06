# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20140305123354) do

  create_table "events", force: true do |t|
    t.date     "date"
    t.integer  "minyan_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "events", ["minyan_id"], name: "index_events_on_minyan_id"

  create_table "minyans", force: true do |t|
    t.string   "title"
    t.text     "description"
    t.boolean  "sun"
    t.boolean  "mon"
    t.boolean  "tue"
    t.boolean  "wed"
    t.boolean  "thu"
    t.boolean  "fri"
    t.boolean  "sat"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "owner_id"
  end

  add_index "minyans", ["owner_id"], name: "index_minyans_on_owner_id"

  create_table "regulars", id: false, force: true do |t|
    t.integer "minyan_id", null: false
    t.integer "yid_id",    null: false
  end

  add_index "regulars", ["minyan_id"], name: "index_regulars_on_minyan_id"
  add_index "regulars", ["yid_id"], name: "index_regulars_on_yid_id"

  create_table "rsvps", force: true do |t|
    t.integer  "event_id",   null: false
    t.integer  "yid_id",     null: false
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "rsvps", ["event_id"], name: "index_rsvps_on_event_id"
  add_index "rsvps", ["id"], name: "index_rsvps_on_id"
  add_index "rsvps", ["yid_id"], name: "index_rsvps_on_yid_id"

  create_table "yids", force: true do |t|
    t.string   "name"
    t.string   "email"
    t.string   "phone"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "provider"
    t.string   "uid"
    t.string   "oauth_token"
    t.datetime "oauth_expires_at"
  end

end
