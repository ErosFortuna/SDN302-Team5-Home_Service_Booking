const baseOptions = {
  timestamps: true,
  versionKey: false,
  strict: 'throw',
  minimize: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret._id;
      return ret;
    },
  },
  toObject: { virtuals: true },
};

module.exports = { baseOptions };
