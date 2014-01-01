json.array!(@yids) do  |yid|
  json.extract! yid, :id, :name, :email, :phone
end
